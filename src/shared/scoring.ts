// ─────────────────────────────────────────────────────────────
// Motor de análisis: coherencia, creatividad y versatilidad.
// Es una GUÍA para el juez (el host), no la nota final.
// ─────────────────────────────────────────────────────────────

import { DISH_BY_ID, TECHNIQUES, familyPairing } from './dishes';
import { CATEGORIES, toGrams } from './ingredients';
import type {
  Analysis,
  CoherenceResult,
  CreativityResult,
  DishType,
  Family,
  Finding,
  Flavor,
  FlavorKey,
  Ingredient,
  Recipe,
  RoundConfig,
  Selector,
  VersatilityResult,
  Verdict,
} from './types';
import { FLAVOR_KEYS } from './types';

export interface Resolved {
  ing: Ingredient;
  amount: number;
  grams: number;
  share: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pct = (v: number) => {
  const p = v * 100;
  return p < 1 ? `${p.toFixed(1).replace('.', ',')}%` : `${Math.round(p)}%`;
};

export function resolveRecipe(recipe: Recipe, basket: Ingredient[]): Resolved[] {
  const byId = new Map(basket.map((i) => [i.id, i]));
  const rows = recipe.items
    .filter((it) => it.amount > 0 && byId.has(it.ingredientId))
    .map((it) => {
      const ing = byId.get(it.ingredientId)!;
      return { ing, amount: it.amount, grams: toGrams(ing, it.amount), share: 0 };
    });
  const total = rows.reduce((a, r) => a + r.grams, 0);
  for (const r of rows) r.share = total > 0 ? r.grams / total : 0;
  return rows;
}

export function matches(ing: Ingredient, sel: Selector): boolean {
  return (
    (sel.roles?.some((r) => ing.roles.includes(r)) ?? false) ||
    (sel.categories?.includes(ing.category) ?? false) ||
    (sel.families?.some((f) => ing.families.includes(f)) ?? false) ||
    (sel.flavorAbove ? Object.entries(sel.flavorAbove).some(([k, v]) => ing.flavor[k as FlavorKey] >= (v ?? 1)) : false)
  );
}

/** Intensidad percibida de cada sabor, 0..1. */
export function computeFlavor(rows: Resolved[]): Flavor {
  const out = {} as Flavor;
  for (const k of FLAVOR_KEYS) {
    const raw = rows.reduce((a, r) => a + r.share * r.ing.potency * r.ing.flavor[k], 0);
    out[k] = 1 - Math.exp(-raw * 3);
  }
  return out;
}

const FLAVOR_TEXT: Record<FlavorKey, { adj: string; noun: string }> = {
  dulce: { adj: 'dulce', noun: 'dulzor' },
  salado: { adj: 'salado', noun: 'sal' },
  acido: { adj: 'ácido', noun: 'acidez' },
  amargo: { adj: 'amargo', noun: 'amargor' },
  umami: { adj: 'intenso en umami', noun: 'sabor profundo (umami)' },
  picante: { adj: 'picante', noun: 'picor' },
};

function dishArticle(dish: DishType): string {
  return `${dish.name.toLowerCase()}`;
}

// ─── Coherencia ─────────────────────────────────────────────

export function scoreCoherence(recipe: Recipe, basket: Ingredient[]): CoherenceResult {
  const rows = resolveRecipe(recipe, basket);
  const dish = DISH_BY_ID.get(recipe.dishTypeId);
  const flavor = computeFlavor(rows);
  const totalGrams = rows.reduce((a, r) => a + r.grams, 0);
  const findings: Finding[] = [];

  if (!dish || rows.length === 0) {
    return {
      score: 0,
      parts: [],
      findings: [{ level: 'bad', text: rows.length === 0 ? 'La receta no tiene ingredientes.' : 'Tipo de plato desconocido.' }],
      flavor,
      totalGrams,
    };
  }

  // 1) Estructura: ¿tiene lo esencial del tipo de plato?
  let structure = 25;
  const missing: string[] = [];
  for (const g of dish.needs) {
    if (!rows.some((r) => matches(r.ing, g.anyOf))) {
      structure -= 10;
      missing.push(g.label);
    }
  }
  if (missing.length) {
    findings.push({ level: 'bad', text: `Para ${dishArticle(dish)} le falta ${missing.join('; ')}.` });
  } else {
    findings.push({ level: 'good', text: `Tiene la base de ${dishArticle(dish)}.` });
  }
  for (const g of dish.nice) {
    if (!rows.some((r) => matches(r.ing, g.anyOf))) {
      structure -= 3;
      findings.push({ level: 'info', text: `Podría sumar ${g.label}.` });
    }
  }
  structure = clamp(structure, 0, 25);

  // 2) Proporciones
  let propPenalty = 0;
  for (const r of rows) {
    if (r.share > r.ing.maxShare) {
      const ratio = r.share / r.ing.maxShare;
      propPenalty += Math.min(16, 6 * Math.log2(ratio) + 4);
      findings.push({
        level: ratio > 2 ? 'bad' : 'warn',
        text: `Demasiado ${r.ing.name.toLowerCase()}: ${pct(r.share)} del plato (lo razonable es hasta ${pct(r.ing.maxShare)}).`,
      });
    }
  }
  for (const rule of dish.shareRules) {
    const hits = rows.filter((r) => matches(r.ing, rule.select));
    if (hits.length === 0) continue;
    const s = hits.reduce((a, r) => a + r.share, 0);
    if (rule.max !== undefined && s > rule.max + 1e-9) {
      if (rule.max === 0) {
        propPenalty += 30;
        findings.push({ level: 'bad', text: `En ${dishArticle(dish)} no va ${rule.label} (${hits.map((h) => h.ing.name).join(', ')}).` });
      } else {
        const ratio = s / rule.max;
        propPenalty += Math.min(16, 6 * Math.log2(ratio) + 4);
        findings.push({
          level: ratio > 2 ? 'bad' : 'warn',
          text: `Para ${dishArticle(dish)} hay mucho de ${rule.label}: ${pct(s)} (se espera hasta ${pct(rule.max)}).`,
        });
      }
    }
    if (rule.min !== undefined && s < rule.min) {
      propPenalty += Math.min(10, 10 * (1 - s / rule.min));
      findings.push({ level: 'warn', text: `Poca proporción de ${rule.label}: ${pct(s)} (se espera al menos ${pct(rule.min)}).` });
    }
  }
  if (totalGrams < 40) {
    propPenalty += 5;
    findings.push({ level: 'warn', text: `Es una porción minúscula (${Math.round(totalGrams)} g en total).` });
  } else if (totalGrams > 8000) {
    findings.push({ level: 'info', text: `Receta enorme: ${(totalGrams / 1000).toFixed(1)} kg en total.` });
  }
  const proportions = clamp(30 - propPenalty, 0, 30);

  // 3) Perfil de sabor vs. lo esperado para el plato
  let flavorPenalty = 0;
  for (const k of FLAVOR_KEYS) {
    const range = dish.flavorRange[k];
    if (!range) continue;
    const v = flavor[k];
    const [lo, hi] = range;
    if (v > hi) {
      const d = v - hi;
      flavorPenalty += Math.min(20, d * 50);
      findings.push({ level: d > 0.2 ? 'bad' : 'warn', text: `Resulta demasiado ${FLAVOR_TEXT[k].adj} para ${dishArticle(dish)}.` });
    } else if (v < lo) {
      const d = lo - v;
      flavorPenalty += Math.min(10, d * 30);
      findings.push({ level: d > 0.25 ? 'warn' : 'info', text: `Le falta ${FLAVOR_TEXT[k].noun}.` });
    }
  }
  if (flavorPenalty === 0) findings.push({ level: 'good', text: 'Perfil de sabor equilibrado para el tipo de plato.' });
  const flavorScore = clamp(25 - flavorPenalty, 0, 25);

  // 4) Maridajes
  const pairs = pairAnalysis(rows);
  let pairing = 10;
  if (pairs.defined > 0) {
    pairing = 10 + 7 * pairs.avg - 3 * pairs.clashes.length;
  }
  for (const c of pairs.clashes.slice(0, 3)) {
    findings.push({ level: 'bad', text: `${c.a} y ${c.b} chocan entre sí.` });
  }
  for (const c of pairs.classics.slice(0, 2)) {
    findings.push({ level: 'good', text: `${c.a} + ${c.b}: combinación clásica que funciona.` });
  }
  pairing = clamp(pairing, 0, 15);

  // 5) Técnica
  let technique = 5;
  if (!dish.techniques.includes(recipe.technique)) {
    technique = 0;
    findings.push({
      level: 'warn',
      text: `${TECHNIQUES[recipe.technique]?.label ?? recipe.technique} no es lo habitual para ${dishArticle(dish)} (suele ser: ${dish.techniques
        .map((t) => TECHNIQUES[t].label.toLowerCase())
        .join(', ')}).`,
    });
  }

  const parts = [
    { label: 'Estructura', score: structure, max: 25 },
    { label: 'Proporciones', score: proportions, max: 30 },
    { label: 'Sabor', score: flavorScore, max: 25 },
    { label: 'Maridajes', score: pairing, max: 15 },
    { label: 'Técnica', score: technique, max: 5 },
  ];
  const base = parts.reduce((a, p) => a + p.score, 0);
  // Cada incoherencia grave multiplica: lo absurdo tiene que notarse.
  const severe = findings.filter((f) => f.level === 'bad').length;
  const multiplier = Math.pow(0.88, severe);
  const score = clamp(Math.round(base * multiplier), 0, 100);
  const rounded = parts.map((p) => ({ ...p, score: Math.round(p.score) }));
  const sumRounded = rounded.reduce((a, p) => a + p.score, 0);
  if (severe > 0) {
    rounded.push({ label: `Incoherencias graves (×${multiplier.toFixed(2).replace('.', ',')})`, score: score - sumRounded, max: 0 });
  }
  return { score, parts: rounded, findings, flavor, totalGrams };
}

interface PairInfo {
  a: string;
  b: string;
  value: number;
  famA: Family;
  famB: Family;
}

export function pairAnalysis(rows: Resolved[]) {
  let sum = 0;
  let defined = 0;
  const clashes: PairInfo[] = [];
  const classics: PairInfo[] = [];
  const surprises: PairInfo[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const A = rows[i].ing;
      const B = rows[j].ing;
      let best: { value: number; surprise?: boolean; fa: Family; fb: Family } | null = null;
      let worst: { value: number; fa: Family; fb: Family } | null = null;
      for (const fa of A.families) {
        for (const fb of B.families) {
          if (fa === fb) continue;
          const p = familyPairing(fa, fb);
          if (!p) continue;
          if (!best || p.value > best.value) best = { ...p, fa, fb };
          if (!worst || p.value < worst.value) worst = { value: p.value, fa, fb };
        }
      }
      if (!best || !worst) continue;
      // Un choque fuerte domina sobre un buen maridaje parcial
      const value = worst.value <= -0.5 ? worst.value : best.value;
      sum += value;
      defined++;
      if (value <= -0.5) clashes.push({ a: A.name, b: B.name, value, famA: worst.fa, famB: worst.fb });
      else if (best.surprise && best.value > 0) surprises.push({ a: A.name, b: B.name, value: best.value, famA: best.fa, famB: best.fb });
      else if (best.value >= 0.8) classics.push({ a: A.name, b: B.name, value: best.value, famA: best.fa, famB: best.fb });
    }
  }
  return { avg: defined ? sum / defined : 0, defined, clashes, classics, surprises };
}

// ─── Creatividad ────────────────────────────────────────────

const SAVORY_FAMILIES: Family[] = ['herbal', 'picante', 'queso', 'tierra', 'ahumado', 'verde', 'allium', 'marino', 'carne_roja', 'cerdo', 'ave', 'tomate'];
const SWEET_FAMILIES: Family[] = ['fruta_dulce', 'frutos_rojos', 'tropical', 'miel', 'chocolate', 'cafe', 'vainilla', 'especia_calida'];

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function scoreCreativity(
  recipe: Recipe,
  basket: Ingredient[],
  others: Recipe[],
  coherence: number,
): CreativityResult {
  const rows = resolveRecipe(recipe, basket);
  const dish = DISH_BY_ID.get(recipe.dishTypeId);
  const findings: Finding[] = [];
  const ids = new Set(rows.map((r) => r.ing.id));

  // 1) Originalidad dentro de la ronda
  let originality = 20;
  if (others.length === 0) {
    findings.push({ level: 'info', text: 'No hay otros platos para comparar originalidad.' });
  } else if (ids.size > 0) {
    const otherSets = others.map((o) => new Set(o.items.filter((i) => i.amount > 0).map((i) => i.ingredientId)));
    const usage = (id: string) => otherSets.filter((s) => s.has(id)).length / others.length;
    const rarity = [...ids].reduce((a, id) => a + (1 - usage(id)), 0) / ids.size;
    const maxSim = Math.max(...otherSets.map((s) => jaccard(ids, s)));
    const dishRarity = 1 - others.filter((o) => o.dishTypeId === recipe.dishTypeId).length / others.length;
    originality = 40 * (0.4 * rarity + 0.35 * (1 - maxSim) + 0.25 * dishRarity);

    const unique = rows.filter((r) => usage(r.ing.id) === 0).map((r) => r.ing.name);
    if (unique.length) findings.push({ level: 'good', text: `Único en usar: ${unique.slice(0, 4).join(', ')}${unique.length > 4 ? '…' : ''}.` });
    if (maxSim >= 0.75) findings.push({ level: 'warn', text: 'Muy parecido a otro plato de la ronda.' });
    if (dishRarity === 1 && dish) findings.push({ level: 'good', text: `Nadie más eligió ${dish.name.toLowerCase()}.` });
  }

  // 2) Combinaciones audaces
  let bold = 0;
  const pairs = pairAnalysis(rows);
  const seenFamilyPairs = new Set<string>();
  for (const s of pairs.surprises) {
    const key = [s.famA, s.famB].sort().join('|');
    if (seenFamilyPairs.has(key)) continue;
    seenFamilyPairs.add(key);
    bold += 12;
    findings.push({ level: 'good', text: `Combinación audaz que funciona: ${s.a} + ${s.b}.` });
  }
  if (dish && dish.profile !== 'neutro') {
    const crossFamilies = dish.profile === 'dulce' ? SAVORY_FAMILIES : SWEET_FAMILIES;
    const clashing = new Set(pairs.clashes.flatMap((c) => [c.a, c.b]));
    for (const r of rows) {
      const isCross = r.ing.families.some((f) => crossFamilies.includes(f));
      const isProfileMain = dish.profile === 'dulce' ? r.ing.roles.includes('endulzante') : r.ing.roles.includes('sal');
      if (isCross && !isProfileMain && !clashing.has(r.ing.name) && r.share <= r.ing.maxShare) {
        bold += 6;
        findings.push({ level: 'good', text: `Toque inesperado: ${r.ing.name.toLowerCase()} en un plato ${dish.profile}.` });
      }
    }
  }
  if (rows.some((r) => r.ing.custom)) {
    bold += 4;
    findings.push({ level: 'info', text: 'Usa ingredientes especiales agregados por el juez.' });
  }
  bold = clamp(bold, 0, 35);

  // 3) Variedad de categorías y sabores
  const cats = new Set(rows.map((r) => r.ing.category)).size;
  const flavor = computeFlavor(rows);
  const dims = FLAVOR_KEYS.filter((k) => flavor[k] > 0.2).length;
  const variety = clamp((cats - 1) * 3.75, 0, 15) + clamp((dims - 1) * 3.4, 0, 10);
  if (cats >= 5) findings.push({ level: 'good', text: `Ingredientes de ${cats} familias distintas.` });
  if (dims >= 4) findings.push({ level: 'good', text: `Sabor complejo: ${dims} dimensiones presentes.` });

  const raw = Math.round(clamp(originality + bold + variety, 0, 100));
  // La creatividad solo cuenta si el plato es coherente
  const coherenceFactor = clamp((coherence - 35) / 45, 0, 1);
  if (coherenceFactor < 1) {
    findings.push({
      level: coherenceFactor === 0 ? 'bad' : 'warn',
      text: `La creatividad cuenta al ${Math.round(coherenceFactor * 100)}% porque la coherencia es ${coherence < 50 ? 'baja' : 'mejorable'}.`,
    });
  }
  return {
    raw,
    coherenceFactor,
    score: Math.round(raw * coherenceFactor),
    parts: [
      { label: 'Originalidad en la ronda', score: Math.round(originality), max: 40 },
      { label: 'Combinaciones audaces', score: Math.round(bold), max: 35 },
      { label: 'Variedad', score: Math.round(variety), max: 25 },
    ],
    findings,
  };
}

// ─── Versatilidad ───────────────────────────────────────────

export function scoreVersatility(recipe: Recipe, previous: Recipe[]): VersatilityResult | null {
  if (previous.length === 0) return null;
  const findings: Finding[] = [];
  const dish = DISH_BY_ID.get(recipe.dishTypeId);
  const profileOf = (r: Recipe) => DISH_BY_ID.get(r.dishTypeId)?.profile ?? 'neutro';

  const newDish = !previous.some((p) => p.dishTypeId === recipe.dishTypeId);
  const dishScore = newDish ? 35 : 0;
  findings.push(
    newDish
      ? { level: 'good', text: `Primera vez que hace ${dish?.name.toLowerCase() ?? 'este plato'}.` }
      : { level: 'warn', text: `Repite tipo de plato (${dish?.name.toLowerCase() ?? '?'}).` },
  );

  const last = previous[previous.length - 1];
  const curProfile = profileOf(recipe);
  const lastProfile = profileOf(last);
  let profileScore = 0;
  if (curProfile !== lastProfile && curProfile !== 'neutro' && lastProfile !== 'neutro') {
    profileScore = 20;
    findings.push({ level: 'good', text: `Cambió de ${lastProfile} a ${curProfile}.` });
  } else if (curProfile !== lastProfile) {
    profileScore = 12;
  } else {
    const profiles = new Set(previous.map(profileOf));
    profiles.add(curProfile);
    profileScore = profiles.size > 1 ? 8 : 0;
    if (profileScore === 0) findings.push({ level: 'warn', text: `Siempre platos de perfil ${curProfile}.` });
  }

  const newTech = !previous.some((p) => p.technique === recipe.technique);
  const techScore = newTech ? 20 : 0;
  if (newTech) findings.push({ level: 'good', text: `Técnica nueva: ${TECHNIQUES[recipe.technique]?.label.toLowerCase()}.` });

  const ids = new Set(recipe.items.filter((i) => i.amount > 0).map((i) => i.ingredientId));
  const prevIds = new Set(previous.flatMap((p) => p.items.map((i) => i.ingredientId)));
  const overlap = ids.size ? [...ids].filter((id) => prevIds.has(id)).length / ids.size : 1;
  const ingScore = 25 * (1 - overlap);
  if (overlap > 0.6) findings.push({ level: 'warn', text: `Repite ${Math.round(overlap * 100)}% de ingredientes de rondas anteriores.` });
  else if (overlap < 0.3) findings.push({ level: 'good', text: 'Ingredientes casi todos nuevos para este jugador.' });

  const parts = [
    { label: 'Tipo de plato nuevo', score: dishScore, max: 35 },
    { label: 'Cambio dulce/salado', score: profileScore, max: 20 },
    { label: 'Técnica nueva', score: techScore, max: 20 },
    { label: 'Ingredientes nuevos', score: Math.round(ingScore), max: 25 },
  ];
  return { score: Math.round(clamp(dishScore + profileScore + techScore + ingScore, 0, 100)), parts, findings };
}

// ─── Puntaje combinado ──────────────────────────────────────

/** Cuánto pesa cada criterio en la nota. */
export const SCORE_WEIGHTS = { coherence: 40, creativity: 40, versatility: 20 } as const;

export function weightedTotal(scores: { coherence: number; creativity: number; versatility: number | null }): number {
  const w = SCORE_WEIGHTS;
  let num = scores.coherence * w.coherence + scores.creativity * w.creativity;
  let den = w.coherence + w.creativity;
  if (scores.versatility !== null) {
    num += scores.versatility * w.versatility;
    den += w.versatility;
  }
  return num / den;
}

export interface SubmissionInput {
  id: string;
  playerId: string;
  recipe: Recipe;
}

/** Analiza todas las entregas de una ronda (la creatividad depende de las demás). */
export function analyzeRound(
  subs: SubmissionInput[],
  config: RoundConfig,
  previousByPlayer: Map<string, Recipe[]>,
): Map<string, Analysis> {
  const out = new Map<string, Analysis>();
  for (const s of subs) {
    const coherence = scoreCoherence(s.recipe, config.basket);
    const others = subs.filter((o) => o.id !== s.id).map((o) => o.recipe);
    const creativity = scoreCreativity(s.recipe, config.basket, others, coherence.score);
    const versatility = scoreVersatility(s.recipe, previousByPlayer.get(s.playerId) ?? []);
    const suggestedScores = {
      coherence: coherence.score,
      creativity: creativity.score,
      versatility: versatility?.score ?? null,
    };
    const total = clamp(Math.round(weightedTotal(suggestedScores)), 0, 100);
    out.set(s.id, { coherence, creativity, versatility, suggested: { ...suggestedScores, total } });
  }
  return out;
}

/** Veredicto inicial a partir de la sugerencia automática. */
export function verdictFromSuggestion(a: Analysis): Verdict {
  return {
    coherence: a.suggested.coherence,
    creativity: a.suggested.creativity,
    versatility: a.suggested.versatility,
    bonus: 0,
    comment: '',
    award: null,
  };
}

/** Puntos finales de una receta según el veredicto del juez. */
export function pointsFromVerdict(v: Verdict): number {
  const base = weightedTotal({ coherence: v.coherence, creativity: v.creativity, versatility: v.versatility });
  return Math.round(clamp(base + v.bonus, 0, 120));
}

/** Alertas para el jugador mientras cocina (sin números). */
export function draftHints(recipe: Recipe, basket: Ingredient[]): Finding[] {
  if (recipe.items.length === 0) return [];
  const c = scoreCoherence(recipe, basket);
  return c.findings.filter((f) => f.level === 'bad' || f.level === 'warn').slice(0, 4);
}

export function categoryLabel(ing: Ingredient): string {
  return CATEGORIES[ing.category].label;
}
