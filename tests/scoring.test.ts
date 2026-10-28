import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/shared/ingredients';
import { checkRules, DEFAULT_RULES, sanitizeRules } from '../src/shared/rules';
import {
  analyzeRound,
  pointsFromVerdict,
  scoreCoherence,
  scoreCreativity,
  scoreVersatility,
  verdictFromSuggestion,
} from '../src/shared/scoring';
import type { Recipe, Technique } from '../src/shared/types';

const r = (name: string, dishTypeId: string, technique: Technique, items: [string, number][]): Recipe => ({
  name,
  dishTypeId,
  technique,
  description: '',
  items: items.map(([ingredientId, amount]) => ({ ingredientId, amount })),
});

const bizcochuelo = r('Bizcochuelo', 'torta', 'hornear', [
  ['harina', 250], ['azucar', 200], ['huevo', 3], ['manteca', 100], ['leche', 120], ['polvo_hornear', 10], ['sal', 2], ['vainilla', 5],
]);
const tortaSalada = r('Torta salada', 'torta', 'hornear', [
  ['harina', 250], ['azucar', 200], ['huevo', 3], ['manteca', 100], ['leche', 120], ['polvo_hornear', 10], ['sal', 40],
]);
const browniePicante = r('Brownie picante', 'torta', 'hornear', [
  ['harina', 120], ['azucar', 180], ['huevo', 3], ['chocolate', 200], ['manteca', 120], ['aji_molido', 2], ['sal', 1], ['nueces', 60],
]);
const guiso = r('Guiso de lentejas', 'guiso', 'hervir', [
  ['lentejas', 300], ['cebolla', 150], ['tomate', 200], ['ajo', 2], ['caldo', 500], ['pimenton', 4], ['sal', 8], ['aceite', 20], ['zanahoria', 100],
]);
const licuadoCarne = r('Licuado de carne', 'bebida', 'licuar', [['leche', 300], ['carne_picada', 200], ['azucar', 30]]);
const cerdoMango = r('Cerdo con mango', 'salteado', 'saltear', [
  ['bondiola', 400], ['mango', 150], ['cebolla', 100], ['soja', 20], ['aji_molido', 2], ['aceite', 15], ['ajo', 2],
]);

describe('coherencia', () => {
  it('una receta clásica es muy coherente', () => {
    expect(scoreCoherence(bizcochuelo, CATALOG).score).toBeGreaterThanOrEqual(90);
    expect(scoreCoherence(guiso, CATALOG).score).toBeGreaterThanOrEqual(90);
  });

  it('una torta con muchísima sal es incoherente', () => {
    const c = scoreCoherence(tortaSalada, CATALOG);
    expect(c.score).toBeLessThan(50);
    expect(c.findings.some((f) => f.level === 'bad' && /sal/i.test(f.text))).toBe(true);
  });

  it('carne en un licuado se penaliza fuerte', () => {
    expect(scoreCoherence(licuadoCarne, CATALOG).score).toBeLessThan(55);
  });

  it('la falta de estructura se detecta', () => {
    const soloAzucar = r('Torta de azúcar', 'torta', 'hornear', [['azucar', 200]]);
    const c = scoreCoherence(soloAzucar, CATALOG);
    expect(c.score).toBeLessThan(40);
    expect(c.findings.some((f) => /le falta/i.test(f.text))).toBe(true);
  });

  it('una técnica rara resta', () => {
    const crudo = { ...bizcochuelo, technique: 'crudo' as const };
    expect(scoreCoherence(crudo, CATALOG).score).toBeLessThan(scoreCoherence(bizcochuelo, CATALOG).score);
  });

  it('receta vacía da 0', () => {
    expect(scoreCoherence(r('Nada', 'torta', 'hornear', []), CATALOG).score).toBe(0);
  });
});

describe('creatividad', () => {
  const ronda = [bizcochuelo, browniePicante, guiso, cerdoMango];
  const creat = (rec: Recipe) => {
    const coh = scoreCoherence(rec, CATALOG).score;
    return scoreCreativity(rec, CATALOG, ronda.filter((x) => x !== rec), coh);
  };

  it('premia combinaciones audaces y coherentes', () => {
    expect(creat(browniePicante).score).toBeGreaterThan(creat(bizcochuelo).score);
    expect(creat(cerdoMango).score).toBeGreaterThan(creat(guiso).score);
    expect(creat(cerdoMango).findings.some((f) => /audaz/i.test(f.text))).toBe(true);
  });

  it('lo creativo pero absurdo no suma', () => {
    const coh = scoreCoherence(licuadoCarne, CATALOG).score;
    const c = scoreCreativity(licuadoCarne, CATALOG, ronda, coh);
    expect(c.coherenceFactor).toBeLessThan(0.3);
    expect(c.score).toBeLessThan(c.raw);
  });

  it('dos platos idénticos son menos originales', () => {
    const coh = scoreCoherence(bizcochuelo, CATALOG).score;
    const solo = scoreCreativity(bizcochuelo, CATALOG, [guiso], coh);
    const copia = scoreCreativity(bizcochuelo, CATALOG, [bizcochuelo], coh);
    expect(copia.parts[0].score).toBeLessThan(solo.parts[0].score);
  });
});

describe('versatilidad', () => {
  it('es null en la primera ronda', () => {
    expect(scoreVersatility(bizcochuelo, [])).toBeNull();
  });
  it('premia cambiar de tipo, perfil y técnica', () => {
    const cambio = scoreVersatility(guiso, [bizcochuelo])!;
    const repite = scoreVersatility(browniePicante, [bizcochuelo])!;
    expect(cambio.score).toBeGreaterThan(70);
    expect(repite.score).toBeLessThan(40);
  });
});

describe('reglas del host', () => {
  it('detecta ingredientes obligatorios, prohibidos y cantidad', () => {
    const rules = sanitizeRules(
      { ...DEFAULT_RULES, requiredIngredientIds: ['nueces'], bannedCategories: ['endulzantes'], maxIngredients: 5 },
      CATALOG,
    );
    const checks = checkRules(bizcochuelo, rules, CATALOG);
    const byId = Object.fromEntries(checks.map((c) => [c.id, c.ok]));
    expect(byId['req_nueces']).toBe(false);
    expect(byId['prohibidos']).toBe(false);
    expect(byId['cantidad']).toBe(false);
    expect(byId['nombre']).toBe(true);
  });

  it('rechaza ingredientes fuera de la canasta', () => {
    const basket = CATALOG.filter((i) => ['harina', 'azucar', 'huevo'].includes(i.id));
    const checks = checkRules(bizcochuelo, DEFAULT_RULES, basket);
    expect(checks.find((c) => c.id === 'canasta')?.ok).toBe(false);
  });

  it('sanitiza valores fuera de rango', () => {
    const s = sanitizeRules({ minIngredients: 50, maxIngredients: -3, timeLimitSec: 99999, theme: 'x'.repeat(500) }, CATALOG);
    expect(s.minIngredients).toBe(30);
    expect(s.maxIngredients).toBe(30);
    expect(s.timeLimitSec).toBe(3600);
    expect(s.theme.length).toBe(140);
  });
});

describe('ronda completa', () => {
  it('analiza y calcula puntos con penalizaciones', () => {
    const rules = { ...DEFAULT_RULES, requiredIngredientIds: ['chocolate'] };
    const config = { basket: CATALOG, rules };
    const subs = [
      { id: 's1', playerId: 'p1', recipe: bizcochuelo },
      { id: 's2', playerId: 'p2', recipe: browniePicante },
    ];
    const analyses = analyzeRound(subs, config, new Map());
    const a1 = analyses.get('s1')!;
    const a2 = analyses.get('s2')!;
    expect(a1.violations).toBeGreaterThan(0); // no usa chocolate
    expect(a2.violations).toBe(0);
    expect(a2.suggested.total).toBeGreaterThan(a1.suggested.total);

    const v = verdictFromSuggestion(a2, rules);
    const base = pointsFromVerdict(v, a2, rules);
    expect(pointsFromVerdict({ ...v, bonus: 10 }, a2, rules)).toBe(Math.min(120, base + 10));
    const withCustom = { ...rules, customRules: ['Nombre con rima'] };
    const vc = { ...verdictFromSuggestion(a2, withCustom), customRuleChecks: [false] };
    expect(pointsFromVerdict(vc, a2, withCustom)).toBe(Math.max(0, base - rules.penaltyPerViolation));
  });
});
