// ─────────────────────────────────────────────────────────────
// Tipos compartidos entre cliente y servidor
// ─────────────────────────────────────────────────────────────

export const FLAVOR_KEYS = ['dulce', 'salado', 'acido', 'amargo', 'umami', 'picante'] as const;
export type FlavorKey = (typeof FLAVOR_KEYS)[number];
export type Flavor = Record<FlavorKey, number>;

export const CATEGORY_IDS = [
  'harinas_cereales',
  'lacteos',
  'huevos',
  'carnes',
  'pescados',
  'verduras',
  'frutas',
  'legumbres',
  'frutos_secos',
  'endulzantes',
  'grasas',
  'condimentos',
  'especias',
  'hierbas',
  'liquidos',
  'leudantes',
  'otros',
] as const;
export type Category = (typeof CATEGORY_IDS)[number];

/** Función que cumple un ingrediente dentro de una receta. */
export const ROLE_IDS = [
  'estructura', // da cuerpo: harinas, arroz, fideos, papa
  'proteina',
  'grasa',
  'liquido',
  'ligante', // une: huevo, maicena, gelatina
  'leudante',
  'endulzante',
  'sal',
  'acido',
  'aromatico', // ajo, cebolla, hierbas, especias
  'picante',
  'vegetal',
  'fruta',
  'textura', // crocante: frutos secos, semillas
] as const;
export type Role = (typeof ROLE_IDS)[number];

/** Familias de sabor, usadas para evaluar maridajes. */
export const FAMILY_IDS = [
  'chocolate',
  'cafe',
  'vainilla',
  'citrico',
  'frutos_rojos',
  'tropical',
  'fruta_dulce',
  'lacteo',
  'queso',
  'marino',
  'carne_roja',
  'ave',
  'cerdo',
  'ahumado',
  'tostado',
  'allium',
  'herbal',
  'especia_calida',
  'picante',
  'tomate',
  'tierra',
  'verde',
  'cereal',
  'miel',
] as const;
export type Family = (typeof FAMILY_IDS)[number];

export type Unit = 'g' | 'ml' | 'u';

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  roles: Role[];
  /** Perfil de sabor, 0..1 por dimensión. */
  flavor: Flavor;
  /** Cuánto impacta en el sabor por gramo (sal ≈ 30, harina ≈ 0.3). */
  potency: number;
  unit: Unit;
  /** Gramos por unidad (para 'u'); para 'ml' se asume ≈ 1. */
  gramsPerUnit: number;
  /** Incremento sugerido en la unidad del ingrediente. */
  step: number;
  /** Fracción máxima razonable del peso total en cualquier receta (0..1). */
  maxShare: number;
  families: Family[];
  /** true si lo creó el host. */
  custom?: boolean;
}

export const TECHNIQUE_IDS = ['hornear', 'hervir', 'saltear', 'freir', 'plancha', 'crudo', 'licuar', 'heladera'] as const;
export type Technique = (typeof TECHNIQUE_IDS)[number];

export type DishProfile = 'dulce' | 'salado' | 'neutro';

/** Selecciona ingredientes por rol, categoría o familia (cualquiera que coincida). */
export interface Selector {
  roles?: Role[];
  categories?: Category[];
  families?: Family[];
  /** Coincide si el ingrediente supera alguno de estos niveles de sabor. */
  flavorAbove?: Partial<Record<FlavorKey, number>>;
}

export interface RoleGroup {
  /** Basta con que algún ingrediente tenga alguno de estos roles. */
  anyOf: Selector;
  label: string;
}

export interface ShareRule {
  select: Selector;
  min?: number;
  max?: number;
  /** Cómo se nombra al grupo en los mensajes ("la sal", "los endulzantes"). */
  label: string;
}

export interface DishType {
  id: string;
  name: string;
  emoji: string;
  profile: DishProfile;
  description: string;
  needs: RoleGroup[];
  nice: RoleGroup[];
  shareRules: ShareRule[];
  flavorRange: Partial<Record<FlavorKey, [number, number]>>;
  techniques: Technique[];
}

// ─── Recetas ────────────────────────────────────────────────

export interface RecipeItem {
  ingredientId: string;
  /** Cantidad en la unidad del ingrediente. */
  amount: number;
}

export interface Recipe {
  name: string;
  dishTypeId: string;
  technique: Technique;
  description: string;
  items: RecipeItem[];
}

// ─── Reglas de ronda (definidas por el host) ───────────────

export interface ScoreWeights {
  coherence: number;
  creativity: number;
  versatility: number;
}

export interface RoundRules {
  /** Consigna libre, ej. "Un postre para un día de lluvia". */
  theme: string;
  /** Segundos; 0 = sin límite. */
  timeLimitSec: number;
  /** Tipos de plato permitidos; vacío = todos. */
  allowedDishTypes: string[];
  requiredProfile: 'any' | 'dulce' | 'salado';
  minIngredients: number;
  maxIngredients: number;
  /** Ingredientes de la canasta que deben usarse sí o sí. */
  requiredIngredientIds: string[];
  /** Categorías prohibidas. */
  bannedCategories: Category[];
  /** Peso total máximo en gramos; null = sin límite. */
  maxTotalGrams: number | null;
  /** Reglas libres que el host verifica a mano al juzgar. */
  customRules: string[];
  weights: ScoreWeights;
  /** Puntos que se restan por cada regla incumplida. */
  penaltyPerViolation: number;
}

export interface RoundConfig {
  basket: Ingredient[];
  rules: RoundRules;
}

export interface RuleCheck {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

// ─── Análisis automático ────────────────────────────────────

export type FindingLevel = 'good' | 'warn' | 'bad' | 'info';

export interface Finding {
  level: FindingLevel;
  text: string;
}

export interface ScorePart {
  label: string;
  score: number;
  max: number;
}

export interface CoherenceResult {
  score: number;
  parts: ScorePart[];
  findings: Finding[];
  flavor: Flavor;
  totalGrams: number;
}

export interface CreativityResult {
  /** Creatividad "pura". */
  raw: number;
  /** Factor 0..1 según la coherencia: lo absurdo no suma. */
  coherenceFactor: number;
  /** raw × factor. */
  score: number;
  parts: ScorePart[];
  findings: Finding[];
}

export interface VersatilityResult {
  score: number;
  parts: ScorePart[];
  findings: Finding[];
}

export interface Analysis {
  coherence: CoherenceResult;
  creativity: CreativityResult;
  /** null en la primera receta del jugador. */
  versatility: VersatilityResult | null;
  ruleChecks: RuleCheck[];
  violations: number;
  suggested: {
    coherence: number;
    creativity: number;
    versatility: number | null;
    total: number;
  };
}

// ─── Veredicto del host ─────────────────────────────────────

export const AWARDS = [
  { id: 'plato_del_dia', label: 'Plato del día', emoji: '👨‍🍳' },
  { id: 'mas_creativo', label: 'Más creativo', emoji: '🎨' },
  { id: 'mas_coherente', label: 'Más equilibrado', emoji: '⚖️' },
  { id: 'mas_versatil', label: 'Más versátil', emoji: '🔄' },
  { id: 'mas_audaz', label: 'Más audaz', emoji: '🔥' },
  { id: 'mejor_nombre', label: 'Mejor nombre', emoji: '🏷️' },
] as const;
export type AwardId = (typeof AWARDS)[number]['id'];

export interface Verdict {
  coherence: number;
  creativity: number;
  versatility: number | null;
  /** Ajuste libre del juez, −20..+20. */
  bonus: number;
  comment: string;
  award: AwardId | null;
  /** Resultado de cada regla libre (mismo orden que rules.customRules). */
  customRuleChecks: boolean[];
}

// ─── Vistas que envía el servidor ───────────────────────────

export type Phase = 'setup' | 'cooking' | 'judging' | 'results' | 'final';

export interface RoomSettings {
  /** El juez ve "Plato A, B, C" en lugar de nombres. */
  anonymousJudging: boolean;
  /** Los jugadores ven alertas de coherencia mientras cocinan. */
  showHints: boolean;
  plannedRounds: number;
}

export type PlayerStatus = 'esperando' | 'cocinando' | 'entregado' | 'sin_entregar';

export interface PublicPlayer {
  id: string;
  name: string;
  connected: boolean;
  score: number;
  status: PlayerStatus;
  draftCount: number;
}

export interface Submission {
  id: string;
  playerId: string;
  recipe: Recipe;
  submittedAt: number;
  /** true si se entregó automáticamente al terminarse el tiempo. */
  auto: boolean;
}

export interface JudgingEntry {
  submissionId: string;
  alias: string;
  /** null si el juzgamiento es anónimo. */
  playerName: string | null;
  recipe: Recipe;
  auto: boolean;
  analysis: Analysis;
  verdict: Verdict | null;
}

export interface ResultEntry {
  submissionId: string;
  playerId: string;
  playerName: string;
  alias: string;
  recipe: Recipe;
  verdict: Verdict;
  analysis: Analysis;
  points: number;
  rank: number;
}

export interface RoundSummary {
  number: number;
  theme: string;
  winner: { name: string; recipeName: string; points: number } | null;
  entries: number;
}

export interface RoomView {
  code: string;
  phase: Phase;
  roundNumber: number;
  settings: RoomSettings;
  serverNow: number;
  me: { id: string; name: string; isHost: boolean };
  host: { id: string; name: string; connected: boolean };
  players: PublicPlayer[];
  /** Host: configuración en edición (o la activa). Jugadores: solo una vez iniciada la ronda. */
  config: RoundConfig | null;
  endsAt: number | null;
  myDraft: Recipe | null;
  mySubmission: Submission | null;
  /** Solo para el host durante el juzgamiento. */
  judging: JudgingEntry[] | null;
  results: ResultEntry[] | null;
  history: RoundSummary[];
}
