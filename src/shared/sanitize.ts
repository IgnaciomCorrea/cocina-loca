// Validación de datos que llegan desde los clientes.

import { DISH_BY_ID, DISH_TYPES } from './dishes';
import { CATALOG_BY_ID, CATEGORIES } from './ingredients';
import type { Category, Family, Ingredient, Recipe, Role, Technique, Unit } from './types';
import { FAMILY_IDS, FLAVOR_KEYS, ROLE_IDS, TECHNIQUE_IDS } from './types';

const num = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const MAX_BASKET = 60;
export const MAX_RECIPE_ITEMS = 30;
/** Cocineros por sala (el juez no cuenta). */
export const MAX_COOKS = 8;

export function sanitizeName(v: unknown): string {
  return str(v, 20).replace(/\s+/g, ' ');
}

export function sanitizeIngredient(input: unknown): Ingredient | null {
  if (!input || typeof input !== 'object') return null;
  const i = input as Partial<Ingredient>;
  const id = str(i.id, 48);
  if (!id) return null;
  // Los ingredientes del catálogo siempre se toman del servidor
  const known = CATALOG_BY_ID.get(id);
  if (known) return known;
  if (!id.startsWith('custom_')) return null;

  const category = (str(i.category, 30) in CATEGORIES ? i.category : 'otros') as Category;
  const name = str(i.name, 40);
  if (!name) return null;
  const flavor = {} as Ingredient['flavor'];
  for (const k of FLAVOR_KEYS) flavor[k] = num(i.flavor?.[k], 0, 1, 0);
  const unit: Unit = i.unit === 'ml' || i.unit === 'u' ? i.unit : 'g';
  return {
    id,
    name,
    emoji: [...str(i.emoji, 16)].slice(0, 2).join('') || CATEGORIES[category].emoji,
    category,
    roles: (Array.isArray(i.roles) ? i.roles : []).filter((r): r is Role => ROLE_IDS.includes(r as Role)),
    families: (Array.isArray(i.families) ? i.families : []).filter((f): f is Family => FAMILY_IDS.includes(f as Family)),
    flavor,
    potency: num(i.potency, 0, 50, 1),
    unit,
    gramsPerUnit: unit === 'u' ? num(i.gramsPerUnit, 0.1, 5000, 50) : 1,
    step: num(i.step, 0.1, 1000, 10),
    maxShare: num(i.maxShare, 0.001, 1, 0.3),
    custom: true,
  };
}

export function sanitizeBasket(input: unknown): Ingredient[] {
  if (!Array.isArray(input)) return [];
  const out: Ingredient[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const ing = sanitizeIngredient(raw);
    if (ing && !seen.has(ing.id)) {
      seen.add(ing.id);
      out.push(ing);
    }
    if (out.length >= MAX_BASKET) break;
  }
  return out;
}

export function emptyRecipe(dishTypeId = DISH_TYPES[0].id): Recipe {
  const dish = DISH_BY_ID.get(dishTypeId) ?? DISH_TYPES[0];
  return { name: '', dishTypeId: dish.id, technique: dish.techniques[0], description: '', items: [] };
}

export function sanitizeRecipe(input: unknown, basket: Ingredient[]): Recipe {
  const r = (input && typeof input === 'object' ? input : {}) as Partial<Recipe>;
  const dishTypeId = DISH_BY_ID.has(String(r.dishTypeId)) ? String(r.dishTypeId) : DISH_TYPES[0].id;
  const technique = TECHNIQUE_IDS.includes(r.technique as Technique)
    ? (r.technique as Technique)
    : DISH_BY_ID.get(dishTypeId)!.techniques[0];
  const basketIds = new Set(basket.map((i) => i.id));
  const seen = new Set<string>();
  const items: Recipe['items'] = [];
  for (const it of Array.isArray(r.items) ? r.items : []) {
    const id = str(it?.ingredientId, 48);
    if (!basketIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    items.push({ ingredientId: id, amount: Math.round(num(it.amount, 0, 100000, 0) * 10) / 10 });
    if (items.length >= MAX_RECIPE_ITEMS) break;
  }
  return {
    name: str(r.name, 60),
    description: str(r.description, 400),
    dishTypeId,
    technique,
    items,
  };
}
