import { DISH_BY_ID, DISH_TYPES } from './dishes';
import { CATEGORIES, toGrams } from './ingredients';
import type { Ingredient, Recipe, RoundRules, RuleCheck } from './types';

export const DEFAULT_RULES: RoundRules = {
  theme: '',
  timeLimitSec: 240,
  allowedDishTypes: [],
  requiredProfile: 'any',
  minIngredients: 3,
  maxIngredients: 10,
  requiredIngredientIds: [],
  bannedCategories: [],
  maxTotalGrams: null,
  customRules: [],
  weights: { coherence: 40, creativity: 40, versatility: 20 },
  penaltyPerViolation: 10,
};

export interface RulePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  apply: (rules: RoundRules, basket: Ingredient[]) => RoundRules;
}

export const RULE_PRESETS: RulePreset[] = [
  {
    id: 'clasico',
    name: 'Clásico',
    emoji: '🍽️',
    description: 'Cualquier plato, 4 minutos, de 3 a 10 ingredientes.',
    apply: (r) => ({ ...DEFAULT_RULES, theme: r.theme, customRules: r.customRules }),
  },
  {
    id: 'sin_azucar',
    name: 'Postre sin azúcar',
    emoji: '🚫🍬',
    description: 'Tiene que ser dulce, pero sin endulzantes agregados.',
    apply: (r) => ({
      ...r,
      requiredProfile: 'dulce',
      bannedCategories: Array.from(new Set([...r.bannedCategories, 'endulzantes' as const])),
      theme: r.theme || 'Un postre dulce… sin azúcar ni endulzantes',
    }),
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    emoji: '🎯',
    description: 'Máximo 4 ingredientes. Menos es más.',
    apply: (r) => ({ ...r, minIngredients: 2, maxIngredients: 4, theme: r.theme || 'Cuatro ingredientes, un gran plato' }),
  },
  {
    id: 'misterio',
    name: 'Ingrediente misterioso',
    emoji: '🎁',
    description: 'Un ingrediente de la canasta al azar es obligatorio.',
    apply: (r, basket) => {
      const candidates = basket.filter((i) => !r.requiredIngredientIds.includes(i.id));
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      return pick ? { ...r, requiredIngredientIds: [...r.requiredIngredientIds, pick.id] } : r;
    },
  },
  {
    id: 'contrarreloj',
    name: 'Contrarreloj',
    emoji: '⏱️',
    description: '90 segundos. Sin pensar demasiado.',
    apply: (r) => ({ ...r, timeLimitSec: 90 }),
  },
  {
    id: 'salado',
    name: 'Solo salado',
    emoji: '🧂',
    description: 'El plato tiene que ser salado.',
    apply: (r) => ({ ...r, requiredProfile: 'salado' }),
  },
  {
    id: 'cambio',
    name: 'Ronda de cambio',
    emoji: '🔄',
    description: 'La versatilidad pesa el doble esta ronda.',
    apply: (r) => ({ ...r, weights: { coherence: 30, creativity: 30, versatility: 40 } }),
  },
];

/** Verifica las reglas automáticas de la ronda sobre una receta. */
export function checkRules(recipe: Recipe, rules: RoundRules, basket: Ingredient[]): RuleCheck[] {
  const checks: RuleCheck[] = [];
  const byId = new Map(basket.map((i) => [i.id, i]));
  const items = recipe.items.filter((it) => it.amount > 0);
  const dish = DISH_BY_ID.get(recipe.dishTypeId);

  checks.push({
    id: 'nombre',
    label: 'El plato tiene nombre',
    ok: recipe.name.trim().length > 0,
  });

  const notInBasket = items.filter((it) => !byId.has(it.ingredientId));
  checks.push({
    id: 'canasta',
    label: 'Solo ingredientes de la canasta',
    ok: notInBasket.length === 0,
    detail: notInBasket.length ? `${notInBasket.length} ingrediente(s) fuera de la canasta` : undefined,
  });

  checks.push({
    id: 'cantidad',
    label:
      rules.minIngredients === rules.maxIngredients
        ? `Exactamente ${rules.minIngredients} ingredientes`
        : `Entre ${rules.minIngredients} y ${rules.maxIngredients} ingredientes`,
    ok: items.length >= rules.minIngredients && items.length <= rules.maxIngredients,
    detail: `Usaste ${items.length}`,
  });

  if (rules.allowedDishTypes.length > 0) {
    const names = rules.allowedDishTypes.map((id) => DISH_BY_ID.get(id)?.name ?? id);
    checks.push({
      id: 'tipo',
      label: `Tipo de plato: ${names.join(', ')}`,
      ok: rules.allowedDishTypes.includes(recipe.dishTypeId),
      detail: dish ? `Elegiste: ${dish.name}` : undefined,
    });
  }

  if (rules.requiredProfile !== 'any') {
    const ok = !!dish && (dish.profile === rules.requiredProfile || dish.profile === 'neutro');
    checks.push({
      id: 'perfil',
      label: rules.requiredProfile === 'dulce' ? 'Tiene que ser un plato dulce' : 'Tiene que ser un plato salado',
      ok,
    });
  }

  for (const reqId of rules.requiredIngredientIds) {
    const ing = byId.get(reqId);
    if (!ing) continue;
    checks.push({
      id: `req_${reqId}`,
      label: `Usar ${ing.emoji} ${ing.name}`,
      ok: items.some((it) => it.ingredientId === reqId),
    });
  }

  if (rules.bannedCategories.length > 0) {
    const used = items
      .map((it) => byId.get(it.ingredientId))
      .filter((i): i is Ingredient => !!i && rules.bannedCategories.includes(i.category));
    checks.push({
      id: 'prohibidos',
      label: `Sin ${rules.bannedCategories.map((c) => CATEGORIES[c].label.toLowerCase()).join(', ')}`,
      ok: used.length === 0,
      detail: used.length ? `Usaste ${used.map((i) => i.name).join(', ')}` : undefined,
    });
  }

  if (rules.maxTotalGrams) {
    const total = items.reduce((acc, it) => {
      const ing = byId.get(it.ingredientId);
      return acc + (ing ? toGrams(ing, it.amount) : 0);
    }, 0);
    checks.push({
      id: 'peso',
      label: `Peso total hasta ${rules.maxTotalGrams} g`,
      ok: total <= rules.maxTotalGrams,
      detail: `Total: ${Math.round(total)} g`,
    });
  }

  return checks;
}

/** Normaliza y acota reglas recibidas desde un cliente. */
export function sanitizeRules(input: Partial<RoundRules>, basket: Ingredient[]): RoundRules {
  const r = { ...DEFAULT_RULES, ...input };
  const int = (v: unknown, min: number, max: number, def: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const basketIds = new Set(basket.map((i) => i.id));
  const dishIds = new Set(DISH_TYPES.map((d) => d.id));
  const minIngredients = int(r.minIngredients, 1, 30, DEFAULT_RULES.minIngredients);
  const maxIngredients = Math.max(minIngredients, int(r.maxIngredients, 1, 30, DEFAULT_RULES.maxIngredients));
  return {
    theme: String(r.theme ?? '').slice(0, 140),
    timeLimitSec: int(r.timeLimitSec, 0, 3600, DEFAULT_RULES.timeLimitSec),
    allowedDishTypes: (Array.isArray(r.allowedDishTypes) ? r.allowedDishTypes : []).filter((id) => dishIds.has(id)),
    requiredProfile: r.requiredProfile === 'dulce' || r.requiredProfile === 'salado' ? r.requiredProfile : 'any',
    minIngredients,
    maxIngredients,
    requiredIngredientIds: (Array.isArray(r.requiredIngredientIds) ? r.requiredIngredientIds : []).filter((id) => basketIds.has(id)),
    bannedCategories: (Array.isArray(r.bannedCategories) ? r.bannedCategories : []).filter((c) => c in CATEGORIES),
    maxTotalGrams: r.maxTotalGrams ? int(r.maxTotalGrams, 50, 100000, 2000) : null,
    customRules: (Array.isArray(r.customRules) ? r.customRules : [])
      .map((s) => String(s).trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 8),
    weights: {
      coherence: int(r.weights?.coherence, 0, 100, 40),
      creativity: int(r.weights?.creativity, 0, 100, 40),
      versatility: int(r.weights?.versatility, 0, 100, 20),
    },
    penaltyPerViolation: int(r.penaltyPerViolation, 0, 50, 10),
  };
}
