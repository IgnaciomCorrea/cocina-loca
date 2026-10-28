import type { Category, Family, Flavor, Ingredient, Role, Unit } from './types';

export function flavor(partial: Partial<Flavor> = {}): Flavor {
  return { dulce: 0, salado: 0, acido: 0, amargo: 0, umami: 0, picante: 0, ...partial };
}

// ─── Categorías ─────────────────────────────────────────────

interface CategoryMeta {
  label: string;
  emoji: string;
  /** Valores por defecto al crear un ingrediente propio en esta categoría. */
  template: Pick<Ingredient, 'roles' | 'families' | 'flavor' | 'potency' | 'unit' | 'gramsPerUnit' | 'step' | 'maxShare'>;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  harinas_cereales: {
    label: 'Harinas y cereales',
    emoji: '🌾',
    template: { roles: ['estructura'], families: ['cereal'], flavor: flavor({ dulce: 0.1 }), potency: 0.3, unit: 'g', gramsPerUnit: 1, step: 25, maxShare: 0.8 },
  },
  lacteos: {
    label: 'Lácteos',
    emoji: '🥛',
    template: { roles: ['grasa'], families: ['lacteo'], flavor: flavor({ dulce: 0.2 }), potency: 0.5, unit: 'g', gramsPerUnit: 1, step: 25, maxShare: 0.6 },
  },
  huevos: {
    label: 'Huevos',
    emoji: '🥚',
    template: { roles: ['ligante', 'proteina'], families: [], flavor: flavor({ umami: 0.2 }), potency: 0.4, unit: 'u', gramsPerUnit: 50, step: 1, maxShare: 0.5 },
  },
  carnes: {
    label: 'Carnes',
    emoji: '🥩',
    template: { roles: ['proteina'], families: ['carne_roja'], flavor: flavor({ umami: 0.6, salado: 0.1 }), potency: 0.8, unit: 'g', gramsPerUnit: 1, step: 50, maxShare: 0.8 },
  },
  pescados: {
    label: 'Pescados y mariscos',
    emoji: '🐟',
    template: { roles: ['proteina'], families: ['marino'], flavor: flavor({ umami: 0.6, salado: 0.2 }), potency: 0.9, unit: 'g', gramsPerUnit: 1, step: 50, maxShare: 0.8 },
  },
  verduras: {
    label: 'Verduras',
    emoji: '🥕',
    template: { roles: ['vegetal'], families: ['verde'], flavor: flavor({ dulce: 0.1 }), potency: 0.5, unit: 'g', gramsPerUnit: 1, step: 50, maxShare: 0.9 },
  },
  frutas: {
    label: 'Frutas',
    emoji: '🍎',
    template: { roles: ['fruta'], families: ['fruta_dulce'], flavor: flavor({ dulce: 0.6, acido: 0.2 }), potency: 0.8, unit: 'g', gramsPerUnit: 1, step: 50, maxShare: 0.9 },
  },
  legumbres: {
    label: 'Legumbres',
    emoji: '🫘',
    template: { roles: ['proteina', 'estructura'], families: ['tierra'], flavor: flavor({ umami: 0.2 }), potency: 0.4, unit: 'g', gramsPerUnit: 1, step: 50, maxShare: 0.8 },
  },
  frutos_secos: {
    label: 'Frutos secos y semillas',
    emoji: '🥜',
    template: { roles: ['textura', 'grasa'], families: ['tostado'], flavor: flavor({ dulce: 0.2, amargo: 0.1 }), potency: 1, unit: 'g', gramsPerUnit: 1, step: 10, maxShare: 0.3 },
  },
  endulzantes: {
    label: 'Endulzantes y chocolate',
    emoji: '🍯',
    template: { roles: ['endulzante'], families: [], flavor: flavor({ dulce: 1 }), potency: 3, unit: 'g', gramsPerUnit: 1, step: 25, maxShare: 0.4 },
  },
  grasas: {
    label: 'Aceites y grasas',
    emoji: '🫒',
    template: { roles: ['grasa'], families: [], flavor: flavor(), potency: 0.4, unit: 'ml', gramsPerUnit: 1, step: 10, maxShare: 0.25 },
  },
  condimentos: {
    label: 'Condimentos',
    emoji: '🧂',
    template: { roles: ['sal'], families: [], flavor: flavor({ salado: 0.8, umami: 0.3 }), potency: 8, unit: 'g', gramsPerUnit: 1, step: 5, maxShare: 0.06 },
  },
  especias: {
    label: 'Especias',
    emoji: '🌶️',
    template: { roles: ['aromatico'], families: ['especia_calida'], flavor: flavor({ amargo: 0.2 }), potency: 15, unit: 'g', gramsPerUnit: 1, step: 1, maxShare: 0.015 },
  },
  hierbas: {
    label: 'Hierbas',
    emoji: '🌿',
    template: { roles: ['aromatico'], families: ['herbal'], flavor: flavor({ amargo: 0.1 }), potency: 3, unit: 'g', gramsPerUnit: 1, step: 5, maxShare: 0.08 },
  },
  liquidos: {
    label: 'Líquidos',
    emoji: '💧',
    template: { roles: ['liquido'], families: [], flavor: flavor(), potency: 0.2, unit: 'ml', gramsPerUnit: 1, step: 50, maxShare: 0.9 },
  },
  leudantes: {
    label: 'Leudantes y gelificantes',
    emoji: '🫧',
    template: { roles: ['leudante'], families: [], flavor: flavor({ amargo: 0.2, salado: 0.2 }), potency: 4, unit: 'g', gramsPerUnit: 1, step: 2, maxShare: 0.03 },
  },
  otros: {
    label: 'Otros',
    emoji: '✨',
    template: { roles: [], families: [], flavor: flavor(), potency: 1, unit: 'g', gramsPerUnit: 1, step: 10, maxShare: 0.3 },
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  estructura: 'Estructura',
  proteina: 'Proteína',
  grasa: 'Grasa',
  liquido: 'Líquido',
  ligante: 'Ligante',
  leudante: 'Leudante',
  endulzante: 'Endulzante',
  sal: 'Salado',
  acido: 'Ácido',
  aromatico: 'Aromático',
  picante: 'Picante',
  vegetal: 'Vegetal',
  fruta: 'Fruta',
  textura: 'Crocante',
};

export const FAMILY_LABELS: Record<Family, string> = {
  chocolate: 'Chocolate',
  cafe: 'Café',
  vainilla: 'Vainilla',
  citrico: 'Cítrico',
  frutos_rojos: 'Frutos rojos',
  tropical: 'Tropical',
  fruta_dulce: 'Fruta dulce',
  lacteo: 'Lácteo',
  queso: 'Queso',
  marino: 'Marino',
  carne_roja: 'Carne roja',
  ave: 'Ave',
  cerdo: 'Cerdo',
  ahumado: 'Ahumado',
  tostado: 'Tostado',
  allium: 'Ajo y cebolla',
  herbal: 'Herbal',
  especia_calida: 'Especia cálida',
  picante: 'Picante',
  tomate: 'Tomate',
  tierra: 'Terroso',
  verde: 'Verde fresco',
  cereal: 'Cereal',
  miel: 'Miel',
};

// ─── Catálogo base ──────────────────────────────────────────

type Def = Partial<Ingredient> & Pick<Ingredient, 'id' | 'name' | 'emoji' | 'category'>;

function ing(def: Def): Ingredient {
  const t = CATEGORIES[def.category].template;
  return {
    roles: [...t.roles],
    families: [...t.families],
    flavor: { ...t.flavor },
    potency: t.potency,
    unit: t.unit as Unit,
    gramsPerUnit: t.gramsPerUnit,
    step: t.step,
    maxShare: t.maxShare,
    ...def,
  };
}

export const CATALOG: Ingredient[] = [
  // Harinas y cereales
  ing({ id: 'harina', name: 'Harina de trigo', emoji: '🌾', category: 'harinas_cereales', roles: ['estructura'], maxShare: 0.75 }),
  ing({ id: 'maicena', name: 'Maicena', emoji: '🌽', category: 'harinas_cereales', roles: ['ligante', 'estructura'], maxShare: 0.2, step: 10, flavor: flavor() }),
  ing({ id: 'arroz', name: 'Arroz', emoji: '🍚', category: 'harinas_cereales', roles: ['estructura'], step: 50, maxShare: 0.7 }),
  ing({ id: 'fideos', name: 'Fideos secos', emoji: '🍝', category: 'harinas_cereales', roles: ['estructura'], step: 50, maxShare: 0.7 }),
  ing({ id: 'avena', name: 'Avena', emoji: '🥣', category: 'harinas_cereales', roles: ['estructura', 'textura'], step: 20, maxShare: 0.5 }),
  ing({ id: 'pan_rallado', name: 'Pan rallado', emoji: '🍞', category: 'harinas_cereales', roles: ['estructura', 'textura'], families: ['cereal', 'tostado'], flavor: flavor({ salado: 0.1 }), step: 20, maxShare: 0.4 }),
  ing({ id: 'polenta', name: 'Polenta', emoji: '🟨', category: 'harinas_cereales', roles: ['estructura'], step: 50, maxShare: 0.5 }),
  ing({ id: 'harina_integral', name: 'Harina integral', emoji: '🌾', category: 'harinas_cereales', roles: ['estructura'], families: ['cereal', 'tostado'], flavor: flavor({ dulce: 0.1, amargo: 0.1 }), maxShare: 0.7 }),
  ing({ id: 'harina_leudante', name: 'Harina leudante', emoji: '🌾', category: 'harinas_cereales', roles: ['estructura', 'leudante'], maxShare: 0.75 }),
  ing({ id: 'pan', name: 'Pan francés', emoji: '🥖', category: 'harinas_cereales', roles: ['estructura'], families: ['cereal', 'tostado'], flavor: flavor({ salado: 0.1 }), step: 50, maxShare: 0.7 }),
  ing({ id: 'galletitas', name: 'Galletitas de vainilla', emoji: '🍪', category: 'harinas_cereales', roles: ['estructura', 'endulzante', 'textura'], families: ['cereal', 'vainilla'], flavor: flavor({ dulce: 0.7 }), potency: 1, step: 25, maxShare: 0.5 }),
  ing({ id: 'galletitas_choco', name: 'Galletitas de chocolate', emoji: '🍪', category: 'harinas_cereales', roles: ['estructura', 'endulzante', 'textura'], families: ['cereal', 'chocolate'], flavor: flavor({ dulce: 0.6, amargo: 0.3 }), potency: 1, step: 25, maxShare: 0.5 }),
  ing({ id: 'tapas_empanada', name: 'Tapas de empanada', emoji: '🥟', category: 'harinas_cereales', roles: ['estructura', 'grasa'], flavor: flavor({ salado: 0.1 }), unit: 'u', gramsPerUnit: 30, step: 1, maxShare: 0.6 }),
  ing({ id: 'tapa_tarta', name: 'Tapa de tarta', emoji: '🫓', category: 'harinas_cereales', roles: ['estructura', 'grasa'], flavor: flavor({ salado: 0.1 }), unit: 'u', gramsPerUnit: 200, step: 1, maxShare: 0.5 }),
  ing({ id: 'maiz_blanco', name: 'Maíz blanco pisado', emoji: '🌽', category: 'harinas_cereales', roles: ['estructura'], step: 50, maxShare: 0.5 }),
  ing({ id: 'fecula_mandioca', name: 'Fécula de mandioca', emoji: '⚪', category: 'harinas_cereales', roles: ['estructura', 'ligante'], flavor: flavor(), step: 25, maxShare: 0.6 }),

  // Lácteos
  ing({ id: 'leche', name: 'Leche', emoji: '🥛', category: 'lacteos', roles: ['liquido'], unit: 'ml', step: 50, flavor: flavor({ dulce: 0.3 }), potency: 0.3, maxShare: 0.8 }),
  ing({ id: 'crema', name: 'Crema de leche', emoji: '🍶', category: 'lacteos', roles: ['grasa', 'liquido'], unit: 'ml', step: 50, flavor: flavor({ dulce: 0.2 }), potency: 0.5, maxShare: 0.6 }),
  ing({ id: 'manteca', name: 'Manteca', emoji: '🧈', category: 'lacteos', roles: ['grasa'], flavor: flavor({ dulce: 0.1, salado: 0.1 }), step: 25, maxShare: 0.35 }),
  ing({ id: 'queso_rallado', name: 'Queso rallado', emoji: '🧀', category: 'lacteos', roles: ['proteina'], families: ['queso'], flavor: flavor({ salado: 0.8, umami: 0.9 }), potency: 2, step: 20, maxShare: 0.2 }),
  ing({ id: 'mozzarella', name: 'Mozzarella', emoji: '🧀', category: 'lacteos', roles: ['proteina', 'grasa'], families: ['queso', 'lacteo'], flavor: flavor({ salado: 0.4, umami: 0.4 }), potency: 0.8, step: 50, maxShare: 0.5 }),
  ing({ id: 'queso_crema', name: 'Queso crema', emoji: '🥯', category: 'lacteos', roles: ['grasa', 'ligante'], families: ['lacteo', 'queso'], flavor: flavor({ salado: 0.2, acido: 0.3 }), potency: 0.7, step: 50, maxShare: 0.6 }),
  ing({ id: 'yogur', name: 'Yogur natural', emoji: '🥄', category: 'lacteos', roles: ['liquido', 'acido'], families: ['lacteo'], flavor: flavor({ acido: 0.6 }), potency: 0.6, step: 50, maxShare: 0.7 }),
  ing({ id: 'dulce_de_leche', name: 'Dulce de leche', emoji: '🍮', category: 'lacteos', roles: ['endulzante'], families: ['lacteo', 'vainilla'], flavor: flavor({ dulce: 1 }), potency: 1.5, step: 50, maxShare: 0.5 }),
  ing({ id: 'ricota', name: 'Ricota', emoji: '🥣', category: 'lacteos', roles: ['proteina', 'ligante'], families: ['lacteo', 'queso'], flavor: flavor({ dulce: 0.1, salado: 0.1 }), potency: 0.4, step: 50, maxShare: 0.7 }),
  ing({ id: 'queso_azul', name: 'Queso azul', emoji: '🧀', category: 'lacteos', roles: ['proteina', 'grasa'], families: ['queso'], flavor: flavor({ salado: 0.7, umami: 0.6, amargo: 0.2, acido: 0.2 }), potency: 2, step: 20, maxShare: 0.2 }),
  ing({ id: 'leche_condensada', name: 'Leche condensada', emoji: '🥫', category: 'lacteos', roles: ['endulzante', 'liquido'], families: ['lacteo', 'vainilla'], flavor: flavor({ dulce: 1 }), potency: 1.8, unit: 'ml', step: 50, maxShare: 0.5 }),
  ing({ id: 'queso_cremoso', name: 'Queso cremoso', emoji: '🧀', category: 'lacteos', roles: ['proteina', 'grasa'], families: ['queso', 'lacteo'], flavor: flavor({ salado: 0.3, umami: 0.3, acido: 0.1 }), potency: 0.6, step: 50, maxShare: 0.5 }),
  ing({ id: 'provolone', name: 'Provolone', emoji: '🧀', category: 'lacteos', roles: ['proteina', 'grasa'], families: ['queso'], flavor: flavor({ salado: 0.6, umami: 0.6, picante: 0.1 }), potency: 1.3, step: 50, maxShare: 0.95 }),

  // Huevos
  ing({ id: 'huevo', name: 'Huevo', emoji: '🥚', category: 'huevos', roles: ['ligante', 'proteina', 'liquido'] }),

  // Carnes
  ing({ id: 'carne_picada', name: 'Carne picada', emoji: '🥩', category: 'carnes', families: ['carne_roja'] }),
  ing({ id: 'pollo', name: 'Pechuga de pollo', emoji: '🍗', category: 'carnes', families: ['ave'], flavor: flavor({ umami: 0.4 }), potency: 0.6 }),
  ing({ id: 'bondiola', name: 'Bondiola de cerdo', emoji: '🐖', category: 'carnes', families: ['cerdo'], flavor: flavor({ umami: 0.5, dulce: 0.1 }) }),
  ing({ id: 'panceta', name: 'Panceta ahumada', emoji: '🥓', category: 'carnes', roles: ['proteina', 'grasa'], families: ['cerdo', 'ahumado'], flavor: flavor({ salado: 0.9, umami: 0.7 }), potency: 2, step: 25, maxShare: 0.3 }),
  ing({ id: 'vacio', name: 'Vacío', emoji: '🥩', category: 'carnes', families: ['carne_roja'], flavor: flavor({ umami: 0.7, salado: 0.1 }) }),
  ing({ id: 'cordero', name: 'Cordero', emoji: '🐑', category: 'carnes', families: ['carne_roja', 'tierra'], flavor: flavor({ umami: 0.6, amargo: 0.1 }), potency: 1 }),
  ing({ id: 'chorizo', name: 'Chorizo', emoji: '🌭', category: 'carnes', roles: ['proteina', 'grasa'], families: ['cerdo'], flavor: flavor({ salado: 0.6, umami: 0.6, picante: 0.1 }), potency: 1.3, maxShare: 0.6 }),
  ing({ id: 'jamon', name: 'Jamón cocido', emoji: '🍖', category: 'carnes', families: ['cerdo'], flavor: flavor({ salado: 0.6, umami: 0.4, dulce: 0.1 }), potency: 1.2, step: 25, maxShare: 0.5 }),
  ing({ id: 'muslo_pollo', name: 'Muslos de pollo', emoji: '🍗', category: 'carnes', roles: ['proteina', 'grasa'], families: ['ave'], flavor: flavor({ umami: 0.5 }), potency: 0.7 }),
  ing({ id: 'asado_tira', name: 'Asado de tira', emoji: '🥩', category: 'carnes', roles: ['proteina', 'grasa'], families: ['carne_roja'], flavor: flavor({ umami: 0.7, salado: 0.1 }) }),
  ing({ id: 'matambre', name: 'Matambre', emoji: '🥩', category: 'carnes', families: ['carne_roja'], flavor: flavor({ umami: 0.6, salado: 0.1 }) }),
  ing({ id: 'nalga', name: 'Nalga', emoji: '🥩', category: 'carnes', families: ['carne_roja'], flavor: flavor({ umami: 0.5 }), potency: 0.7 }),
  ing({ id: 'falda', name: 'Falda', emoji: '🥩', category: 'carnes', roles: ['proteina', 'grasa'], families: ['carne_roja'], flavor: flavor({ umami: 0.6, salado: 0.1 }) }),
  ing({ id: 'morcilla', name: 'Morcilla', emoji: '🌭', category: 'carnes', roles: ['proteina', 'grasa'], families: ['cerdo', 'especia_calida'], flavor: flavor({ salado: 0.5, umami: 0.6, dulce: 0.2 }), potency: 1.3, maxShare: 0.5 }),
  ing({ id: 'salame', name: 'Salame', emoji: '🍖', category: 'carnes', roles: ['proteina', 'grasa'], families: ['cerdo'], flavor: flavor({ salado: 0.8, umami: 0.6, picante: 0.1 }), potency: 1.8, step: 25, maxShare: 0.3 }),
  ing({ id: 'jamon_crudo', name: 'Jamón crudo', emoji: '🍖', category: 'carnes', families: ['cerdo'], flavor: flavor({ salado: 0.8, umami: 0.6 }), potency: 1.8, step: 25, maxShare: 0.35 }),

  // Pescados
  ing({ id: 'atun', name: 'Atún en lata', emoji: '🐟', category: 'pescados', flavor: flavor({ salado: 0.4, umami: 0.7 }) }),
  ing({ id: 'langostinos', name: 'Langostinos', emoji: '🦐', category: 'pescados', flavor: flavor({ dulce: 0.2, umami: 0.6, salado: 0.2 }) }),
  ing({ id: 'salmon', name: 'Salmón', emoji: '🍣', category: 'pescados', roles: ['proteina', 'grasa'] }),
  ing({ id: 'merluza', name: 'Merluza', emoji: '🐟', category: 'pescados', flavor: flavor({ umami: 0.4, salado: 0.1 }), potency: 0.6 }),
  ing({ id: 'calamar', name: 'Calamar', emoji: '🦑', category: 'pescados', flavor: flavor({ umami: 0.5, dulce: 0.1, salado: 0.2 }), potency: 0.7 }),
  ing({ id: 'mejillones', name: 'Mejillones', emoji: '🦪', category: 'pescados', flavor: flavor({ umami: 0.7, salado: 0.4 }), potency: 1 }),
  ing({ id: 'anchoas', name: 'Anchoas', emoji: '🐟', category: 'pescados', roles: ['proteina', 'sal'], flavor: flavor({ salado: 1, umami: 1 }), potency: 5, step: 5, maxShare: 0.05 }),

  // Verduras
  ing({ id: 'cebolla', name: 'Cebolla', emoji: '🧅', category: 'verduras', roles: ['aromatico', 'vegetal'], families: ['allium'], flavor: flavor({ dulce: 0.3, picante: 0.1 }), potency: 0.9, maxShare: 0.4 }),
  ing({ id: 'ajo', name: 'Ajo', emoji: '🧄', category: 'verduras', roles: ['aromatico'], families: ['allium'], flavor: flavor({ picante: 0.4, umami: 0.2 }), potency: 6, unit: 'u', gramsPerUnit: 5, step: 1, maxShare: 0.05 }),
  ing({ id: 'tomate', name: 'Tomate', emoji: '🍅', category: 'verduras', roles: ['vegetal', 'acido'], families: ['tomate'], flavor: flavor({ acido: 0.5, dulce: 0.3, umami: 0.4 }), potency: 0.8, maxShare: 0.7 }),
  ing({ id: 'morron', name: 'Morrón', emoji: '🫑', category: 'verduras', families: ['verde'], flavor: flavor({ dulce: 0.3 }), maxShare: 0.5 }),
  ing({ id: 'zanahoria', name: 'Zanahoria', emoji: '🥕', category: 'verduras', families: ['tierra'], flavor: flavor({ dulce: 0.4 }), maxShare: 0.6 }),
  ing({ id: 'papa', name: 'Papa', emoji: '🥔', category: 'verduras', roles: ['estructura', 'vegetal'], families: ['tierra'], flavor: flavor(), potency: 0.3, maxShare: 0.8 }),
  ing({ id: 'zapallo', name: 'Zapallo', emoji: '🎃', category: 'verduras', roles: ['vegetal', 'estructura'], families: ['tierra'], flavor: flavor({ dulce: 0.4 }), maxShare: 0.8 }),
  ing({ id: 'espinaca', name: 'Espinaca', emoji: '🥬', category: 'verduras', families: ['verde'], flavor: flavor({ amargo: 0.2 }), maxShare: 0.6 }),
  ing({ id: 'champinones', name: 'Champiñones', emoji: '🍄', category: 'verduras', families: ['tierra'], flavor: flavor({ umami: 0.7 }), potency: 0.8, maxShare: 0.6 }),
  ing({ id: 'lechuga', name: 'Lechuga', emoji: '🥗', category: 'verduras', families: ['verde'], flavor: flavor(), potency: 0.2, maxShare: 0.8 }),
  ing({ id: 'pepino', name: 'Pepino', emoji: '🥒', category: 'verduras', families: ['verde'], flavor: flavor({ dulce: 0.1 }), potency: 0.3, maxShare: 0.6 }),
  ing({ id: 'choclo', name: 'Choclo', emoji: '🌽', category: 'verduras', families: ['cereal'], flavor: flavor({ dulce: 0.5 }), maxShare: 0.6 }),
  ing({ id: 'berenjena', name: 'Berenjena', emoji: '🍆', category: 'verduras', families: ['tierra'], flavor: flavor({ amargo: 0.2 }), maxShare: 0.7 }),
  ing({ id: 'zucchini', name: 'Zucchini', emoji: '🥒', category: 'verduras', families: ['verde'], flavor: flavor({ dulce: 0.1 }), potency: 0.3, maxShare: 0.7 }),
  ing({ id: 'brocoli', name: 'Brócoli', emoji: '🥦', category: 'verduras', families: ['verde'], flavor: flavor({ amargo: 0.3 }), potency: 0.6, maxShare: 0.6 }),
  ing({ id: 'coliflor', name: 'Coliflor', emoji: '🥬', category: 'verduras', families: ['tierra'], flavor: flavor({ amargo: 0.2, dulce: 0.1 }), maxShare: 0.7 }),
  ing({ id: 'batata', name: 'Batata', emoji: '🍠', category: 'verduras', roles: ['estructura', 'vegetal'], families: ['tierra'], flavor: flavor({ dulce: 0.6 }), maxShare: 0.8 }),
  ing({ id: 'remolacha', name: 'Remolacha', emoji: '🟣', category: 'verduras', families: ['tierra'], flavor: flavor({ dulce: 0.5, amargo: 0.1 }), maxShare: 0.6 }),
  ing({ id: 'puerro', name: 'Puerro', emoji: '🥬', category: 'verduras', roles: ['aromatico', 'vegetal'], families: ['allium'], flavor: flavor({ dulce: 0.3 }), potency: 0.7, maxShare: 0.4 }),
  ing({ id: 'verdeo', name: 'Cebolla de verdeo', emoji: '🧅', category: 'verduras', roles: ['aromatico', 'vegetal'], families: ['allium', 'verde'], flavor: flavor({ picante: 0.2, dulce: 0.1 }), potency: 1.2, step: 25, maxShare: 0.2 }),
  ing({ id: 'repollo', name: 'Repollo', emoji: '🥬', category: 'verduras', families: ['verde'], flavor: flavor({ dulce: 0.2, amargo: 0.1 }), potency: 0.4, maxShare: 0.7 }),
  ing({ id: 'rucula', name: 'Rúcula', emoji: '🌿', category: 'verduras', families: ['verde'], flavor: flavor({ amargo: 0.3, picante: 0.2 }), potency: 0.8, step: 25, maxShare: 0.5 }),
  ing({ id: 'pure_tomate', name: 'Puré de tomate', emoji: '🥫', category: 'verduras', roles: ['liquido', 'acido', 'vegetal'], families: ['tomate'], flavor: flavor({ acido: 0.5, umami: 0.5, dulce: 0.2 }), potency: 1, maxShare: 0.6 }),
  ing({ id: 'aceitunas', name: 'Aceitunas', emoji: '🫒', category: 'verduras', roles: ['vegetal', 'sal'], families: ['herbal'], flavor: flavor({ salado: 0.7, amargo: 0.2, acido: 0.2 }), potency: 2, step: 25, maxShare: 0.15 }),
  ing({ id: 'aji_fresco', name: 'Ají picante fresco', emoji: '🌶️', category: 'verduras', roles: ['picante', 'aromatico'], families: ['picante'], flavor: flavor({ picante: 0.9 }), potency: 4, step: 5, maxShare: 0.03 }),
  ing({ id: 'acelga', name: 'Acelga', emoji: '🥬', category: 'verduras', families: ['verde'], flavor: flavor({ amargo: 0.2 }), maxShare: 0.7 }),
  ing({ id: 'zapallito', name: 'Zapallito redondo', emoji: '🟢', category: 'verduras', families: ['verde'], flavor: flavor({ dulce: 0.1 }), potency: 0.3, maxShare: 0.7 }),
  ing({ id: 'palmitos', name: 'Palmitos', emoji: '🎋', category: 'verduras', families: ['verde'], flavor: flavor({ dulce: 0.1, acido: 0.2 }), potency: 0.4, maxShare: 0.6 }),

  // Frutas
  ing({ id: 'limon', name: 'Limón', emoji: '🍋', category: 'frutas', roles: ['acido', 'fruta'], families: ['citrico'], flavor: flavor({ acido: 1, amargo: 0.1 }), potency: 3, unit: 'u', gramsPerUnit: 40, step: 1, maxShare: 0.15 }),
  ing({ id: 'naranja', name: 'Naranja', emoji: '🍊', category: 'frutas', roles: ['fruta', 'acido', 'liquido'], families: ['citrico'], flavor: flavor({ dulce: 0.5, acido: 0.5 }), unit: 'u', gramsPerUnit: 150, step: 1, maxShare: 0.5 }),
  ing({ id: 'banana', name: 'Banana', emoji: '🍌', category: 'frutas', families: ['tropical', 'fruta_dulce'], flavor: flavor({ dulce: 0.8 }), unit: 'u', gramsPerUnit: 120, step: 1 }),
  ing({ id: 'manzana', name: 'Manzana', emoji: '🍏', category: 'frutas', families: ['fruta_dulce'], unit: 'u', gramsPerUnit: 150, step: 1 }),
  ing({ id: 'frutilla', name: 'Frutillas', emoji: '🍓', category: 'frutas', families: ['frutos_rojos'], flavor: flavor({ dulce: 0.6, acido: 0.4 }) }),
  ing({ id: 'arandanos', name: 'Arándanos', emoji: '🫐', category: 'frutas', families: ['frutos_rojos'], flavor: flavor({ dulce: 0.5, acido: 0.4 }), step: 25 }),
  ing({ id: 'mango', name: 'Mango', emoji: '🥭', category: 'frutas', families: ['tropical'], flavor: flavor({ dulce: 0.8, acido: 0.2 }) }),
  ing({ id: 'palta', name: 'Palta', emoji: '🥑', category: 'frutas', roles: ['grasa', 'vegetal'], families: ['verde'], flavor: flavor({ umami: 0.1 }), potency: 0.4, unit: 'u', gramsPerUnit: 150, step: 1, maxShare: 0.7 }),
  ing({ id: 'coco', name: 'Coco rallado', emoji: '🥥', category: 'frutas', roles: ['textura', 'grasa'], families: ['tropical'], flavor: flavor({ dulce: 0.4 }), step: 20, maxShare: 0.3 }),
  ing({ id: 'pomelo', name: 'Pomelo', emoji: '🍊', category: 'frutas', roles: ['fruta', 'acido'], families: ['citrico'], flavor: flavor({ acido: 0.6, amargo: 0.4, dulce: 0.3 }), unit: 'u', gramsPerUnit: 250, step: 1, maxShare: 0.5 }),
  ing({ id: 'pera', name: 'Pera', emoji: '🍐', category: 'frutas', families: ['fruta_dulce'], flavor: flavor({ dulce: 0.6, acido: 0.1 }), unit: 'u', gramsPerUnit: 170, step: 1 }),
  ing({ id: 'durazno', name: 'Durazno', emoji: '🍑', category: 'frutas', families: ['fruta_dulce'], flavor: flavor({ dulce: 0.6, acido: 0.2 }), unit: 'u', gramsPerUnit: 150, step: 1 }),
  ing({ id: 'anana', name: 'Ananá', emoji: '🍍', category: 'frutas', roles: ['fruta', 'acido'], families: ['tropical'], flavor: flavor({ dulce: 0.6, acido: 0.5 }) }),
  ing({ id: 'kiwi', name: 'Kiwi', emoji: '🥝', category: 'frutas', roles: ['fruta', 'acido'], families: ['tropical', 'verde'], flavor: flavor({ acido: 0.5, dulce: 0.4 }), unit: 'u', gramsPerUnit: 75, step: 1 }),
  ing({ id: 'uvas', name: 'Uvas', emoji: '🍇', category: 'frutas', families: ['fruta_dulce'], flavor: flavor({ dulce: 0.7, acido: 0.2 }) }),
  ing({ id: 'frambuesas', name: 'Frambuesas', emoji: '🍓', category: 'frutas', families: ['frutos_rojos'], flavor: flavor({ dulce: 0.5, acido: 0.5 }), step: 25 }),
  ing({ id: 'higos', name: 'Higos', emoji: '🟣', category: 'frutas', families: ['fruta_dulce', 'miel'], flavor: flavor({ dulce: 0.8 }), unit: 'u', gramsPerUnit: 50, step: 1, maxShare: 0.6 }),
  ing({ id: 'pasas', name: 'Pasas de uva', emoji: '🍇', category: 'frutas', roles: ['fruta', 'endulzante'], families: ['fruta_dulce'], flavor: flavor({ dulce: 0.9, acido: 0.1 }), potency: 1.5, step: 20, maxShare: 0.2 }),
  ing({ id: 'membrillo', name: 'Dulce de membrillo', emoji: '🟧', category: 'frutas', roles: ['fruta', 'endulzante'], families: ['fruta_dulce'], flavor: flavor({ dulce: 0.9, acido: 0.2 }), potency: 1.5, maxShare: 0.4 }),

  // Legumbres
  ing({ id: 'garbanzos', name: 'Garbanzos', emoji: '🫘', category: 'legumbres' }),
  ing({ id: 'lentejas', name: 'Lentejas', emoji: '🟤', category: 'legumbres' }),
  ing({ id: 'porotos_blancos', name: 'Porotos blancos', emoji: '🫘', category: 'legumbres' }),
  ing({ id: 'porotos_negros', name: 'Porotos negros', emoji: '🫘', category: 'legumbres', flavor: flavor({ umami: 0.3, dulce: 0.1 }) }),
  ing({ id: 'arvejas', name: 'Arvejas', emoji: '🟢', category: 'legumbres', roles: ['vegetal', 'proteina'], families: ['verde'], flavor: flavor({ dulce: 0.4 }), maxShare: 0.6 }),

  // Frutos secos
  ing({ id: 'nueces', name: 'Nueces', emoji: '🌰', category: 'frutos_secos' }),
  ing({ id: 'almendras', name: 'Almendras', emoji: '🥜', category: 'frutos_secos', flavor: flavor({ dulce: 0.3 }) }),
  ing({ id: 'mani', name: 'Maní', emoji: '🥜', category: 'frutos_secos', flavor: flavor({ salado: 0.2, umami: 0.2 }) }),
  ing({ id: 'sesamo', name: 'Semillas de sésamo', emoji: '⚪', category: 'frutos_secos', step: 5, maxShare: 0.1 }),
  ing({ id: 'avellanas', name: 'Avellanas', emoji: '🌰', category: 'frutos_secos', flavor: flavor({ dulce: 0.3, amargo: 0.1 }) }),
  ing({ id: 'girasol', name: 'Semillas de girasol', emoji: '🌻', category: 'frutos_secos', step: 5, maxShare: 0.15 }),

  // Endulzantes
  ing({ id: 'azucar', name: 'Azúcar', emoji: '🍬', category: 'endulzantes' }),
  ing({ id: 'mascabo', name: 'Azúcar mascabo', emoji: '🟫', category: 'endulzantes', families: ['tostado'], flavor: flavor({ dulce: 0.9, amargo: 0.1 }) }),
  ing({ id: 'miel', name: 'Miel', emoji: '🍯', category: 'endulzantes', families: ['miel'], flavor: flavor({ dulce: 1 }), potency: 2.5, step: 10, maxShare: 0.3 }),
  ing({ id: 'chocolate', name: 'Chocolate amargo', emoji: '🍫', category: 'endulzantes', roles: ['endulzante', 'grasa'], families: ['chocolate'], flavor: flavor({ dulce: 0.4, amargo: 0.7 }), potency: 1.5, maxShare: 0.5 }),
  ing({ id: 'cacao', name: 'Cacao en polvo', emoji: '🟤', category: 'endulzantes', roles: ['estructura'], families: ['chocolate'], flavor: flavor({ amargo: 1 }), potency: 3, step: 10, maxShare: 0.15 }),
  ing({ id: 'chocolate_leche', name: 'Chocolate con leche', emoji: '🍫', category: 'endulzantes', roles: ['endulzante', 'grasa'], families: ['chocolate', 'lacteo'], flavor: flavor({ dulce: 0.8, amargo: 0.2 }), potency: 1.5, maxShare: 0.5 }),
  ing({ id: 'chocolate_blanco', name: 'Chocolate blanco', emoji: '⬜', category: 'endulzantes', roles: ['endulzante', 'grasa'], families: ['vainilla', 'lacteo'], flavor: flavor({ dulce: 0.9 }), potency: 1.5, maxShare: 0.4 }),
  ing({ id: 'azucar_impalpable', name: 'Azúcar impalpable', emoji: '🌨️', category: 'endulzantes', step: 10, maxShare: 0.35 }),
  ing({ id: 'mermelada', name: 'Mermelada de durazno', emoji: '🫙', category: 'endulzantes', roles: ['endulzante', 'fruta'], families: ['fruta_dulce'], flavor: flavor({ dulce: 0.9, acido: 0.2 }), potency: 1.5, step: 25, maxShare: 0.5 }),
  ing({ id: 'dulce_batata', name: 'Dulce de batata', emoji: '🟫', category: 'endulzantes', families: ['fruta_dulce', 'tierra'], flavor: flavor({ dulce: 0.9 }), potency: 1.5, maxShare: 0.5 }),

  // Grasas
  ing({ id: 'aceite_oliva', name: 'Aceite de oliva', emoji: '🫒', category: 'grasas', families: ['herbal'], flavor: flavor({ amargo: 0.1 }) }),
  ing({ id: 'aceite', name: 'Aceite de girasol', emoji: '🌻', category: 'grasas' }),
  ing({ id: 'grasa_vacuna', name: 'Grasa vacuna', emoji: '🧈', category: 'grasas', families: ['carne_roja'], unit: 'g', flavor: flavor({ salado: 0.1, umami: 0.2 }), potency: 0.6 }),

  // Condimentos
  ing({ id: 'sal', name: 'Sal', emoji: '🧂', category: 'condimentos', flavor: flavor({ salado: 1 }), potency: 30, step: 1, maxShare: 0.02 }),
  ing({ id: 'sal_gruesa', name: 'Sal gruesa', emoji: '🧂', category: 'condimentos', flavor: flavor({ salado: 1 }), potency: 25, step: 2, maxShare: 0.02 }),
  ing({ id: 'soja', name: 'Salsa de soja', emoji: '🥢', category: 'condimentos', unit: 'ml', flavor: flavor({ salado: 0.9, umami: 0.8 }), potency: 6, step: 5, maxShare: 0.08 }),
  ing({ id: 'vinagre', name: 'Vinagre', emoji: '🫗', category: 'condimentos', roles: ['acido'], unit: 'ml', flavor: flavor({ acido: 1 }), potency: 6, step: 5, maxShare: 0.06 }),
  ing({ id: 'mostaza', name: 'Mostaza', emoji: '🟡', category: 'condimentos', roles: ['acido', 'picante'], families: ['picante'], flavor: flavor({ acido: 0.5, picante: 0.6, salado: 0.4 }), potency: 4, step: 5, maxShare: 0.06 }),
  ing({ id: 'vainilla', name: 'Esencia de vainilla', emoji: '🌼', category: 'condimentos', roles: ['aromatico'], unit: 'ml', families: ['vainilla'], flavor: flavor({ dulce: 0.3 }), potency: 8, step: 1, maxShare: 0.02 }),
  ing({ id: 'cafe', name: 'Café instantáneo', emoji: '☕', category: 'condimentos', roles: ['aromatico'], families: ['cafe'], flavor: flavor({ amargo: 1 }), potency: 10, step: 2, maxShare: 0.03 }),
  ing({ id: 'mayonesa', name: 'Mayonesa', emoji: '🥚', category: 'condimentos', roles: ['grasa', 'ligante'], flavor: flavor({ salado: 0.3, acido: 0.3, umami: 0.1 }), potency: 1, step: 10, maxShare: 0.3 }),
  ing({ id: 'aceto', name: 'Aceto balsámico', emoji: '🫗', category: 'condimentos', roles: ['acido'], unit: 'ml', flavor: flavor({ acido: 0.7, dulce: 0.4 }), potency: 4, step: 5, maxShare: 0.06 }),
  ing({ id: 'salsa_picante', name: 'Salsa picante', emoji: '🌶️', category: 'condimentos', roles: ['picante', 'acido'], families: ['picante'], unit: 'ml', flavor: flavor({ picante: 1, acido: 0.4, salado: 0.3 }), potency: 8, step: 2, maxShare: 0.03 }),
  ing({ id: 'chimichurri', name: 'Chimichurri', emoji: '🫙', category: 'condimentos', roles: ['aromatico', 'acido'], families: ['herbal', 'allium', 'picante'], flavor: flavor({ acido: 0.4, salado: 0.3, picante: 0.3 }), potency: 3, step: 10, maxShare: 0.1 }),
  ing({ id: 'ketchup', name: 'Kétchup', emoji: '🥫', category: 'condimentos', roles: ['acido'], families: ['tomate'], flavor: flavor({ dulce: 0.5, acido: 0.4, salado: 0.4, umami: 0.3 }), potency: 2, step: 10, maxShare: 0.15 }),

  // Especias
  ing({ id: 'pimienta', name: 'Pimienta negra', emoji: '⚫', category: 'especias', roles: ['aromatico', 'picante'], families: ['picante'], flavor: flavor({ picante: 0.7 }), maxShare: 0.01 }),
  ing({ id: 'pimenton', name: 'Pimentón ahumado', emoji: '🟥', category: 'especias', families: ['ahumado'], flavor: flavor({ dulce: 0.2, amargo: 0.1 }), potency: 8, maxShare: 0.02 }),
  ing({ id: 'comino', name: 'Comino', emoji: '🟫', category: 'especias', families: ['especia_calida', 'tierra'], flavor: flavor({ amargo: 0.3 }), maxShare: 0.01 }),
  ing({ id: 'canela', name: 'Canela', emoji: '🪵', category: 'especias', flavor: flavor({ dulce: 0.3 }), potency: 10, maxShare: 0.02 }),
  ing({ id: 'nuez_moscada', name: 'Nuez moscada', emoji: '🟤', category: 'especias', flavor: flavor({ amargo: 0.2 }), potency: 20, maxShare: 0.005 }),
  ing({ id: 'aji_molido', name: 'Ají molido', emoji: '🌶️', category: 'especias', roles: ['picante'], families: ['picante'], flavor: flavor({ picante: 1 }), potency: 20, maxShare: 0.01 }),
  ing({ id: 'jengibre', name: 'Jengibre', emoji: '🫚', category: 'especias', roles: ['aromatico', 'picante'], families: ['especia_calida', 'citrico'], flavor: flavor({ picante: 0.6, dulce: 0.1 }), potency: 5, step: 5, maxShare: 0.03 }),
  ing({ id: 'clavo', name: 'Clavo de olor', emoji: '🟫', category: 'especias', flavor: flavor({ amargo: 0.3, picante: 0.2 }), potency: 25, maxShare: 0.004 }),

  // Hierbas
  ing({ id: 'albahaca', name: 'Albahaca', emoji: '🌿', category: 'hierbas', flavor: flavor({ dulce: 0.1 }) }),
  ing({ id: 'perejil', name: 'Perejil', emoji: '🌱', category: 'hierbas', families: ['herbal', 'verde'] }),
  ing({ id: 'oregano', name: 'Orégano seco', emoji: '🍃', category: 'hierbas', potency: 10, step: 1, maxShare: 0.01 }),
  ing({ id: 'menta', name: 'Menta', emoji: '🌿', category: 'hierbas', families: ['herbal', 'verde'], flavor: flavor({ dulce: 0.1 }) }),
  ing({ id: 'romero', name: 'Romero', emoji: '🌲', category: 'hierbas', potency: 6, step: 2, maxShare: 0.02 }),
  ing({ id: 'cilantro', name: 'Cilantro', emoji: '🌿', category: 'hierbas', families: ['herbal', 'citrico'] }),
  ing({ id: 'tomillo', name: 'Tomillo', emoji: '🌱', category: 'hierbas', potency: 6, step: 2, maxShare: 0.02 }),
  ing({ id: 'ciboulette', name: 'Ciboulette', emoji: '🌱', category: 'hierbas', families: ['herbal', 'allium'], flavor: flavor({ picante: 0.1 }) }),
  ing({ id: 'laurel', name: 'Hojas de laurel', emoji: '🍃', category: 'hierbas', unit: 'u', gramsPerUnit: 0.2, step: 1, potency: 8, maxShare: 0.005 }),
  ing({ id: 'yerba', name: 'Yerba mate', emoji: '🧉', category: 'hierbas', families: ['herbal'], flavor: flavor({ amargo: 0.7 }), potency: 3, step: 5, maxShare: 0.05 }),

  // Líquidos
  ing({ id: 'agua', name: 'Agua', emoji: '💧', category: 'liquidos', potency: 0 }),
  ing({ id: 'caldo', name: 'Caldo de verduras', emoji: '🍲', category: 'liquidos', flavor: flavor({ salado: 0.3, umami: 0.5 }), potency: 0.8, maxShare: 0.8 }),
  ing({ id: 'vino', name: 'Vino tinto', emoji: '🍷', category: 'liquidos', roles: ['liquido', 'acido'], families: ['frutos_rojos'], flavor: flavor({ acido: 0.4, amargo: 0.3 }), potency: 1.5, maxShare: 0.3 }),
  ing({ id: 'caldo_carne', name: 'Caldo de carne', emoji: '🍲', category: 'liquidos', families: ['carne_roja'], flavor: flavor({ salado: 0.3, umami: 0.7 }), potency: 0.9, maxShare: 0.8 }),
  ing({ id: 'vino_blanco', name: 'Vino blanco', emoji: '🥂', category: 'liquidos', roles: ['liquido', 'acido'], families: ['fruta_dulce'], flavor: flavor({ acido: 0.5, amargo: 0.1, dulce: 0.1 }), potency: 1.5, maxShare: 0.3 }),
  ing({ id: 'cerveza', name: 'Cerveza', emoji: '🍺', category: 'liquidos', families: ['cereal'], flavor: flavor({ amargo: 0.4 }), potency: 1, maxShare: 0.5 }),
  ing({ id: 'te', name: 'Té negro', emoji: '🍵', category: 'liquidos', families: ['herbal'], flavor: flavor({ amargo: 0.3 }), potency: 0.5 }),
  ing({ id: 'jugo_naranja', name: 'Jugo de naranja', emoji: '🧃', category: 'liquidos', roles: ['liquido', 'acido'], families: ['citrico'], flavor: flavor({ dulce: 0.5, acido: 0.5 }), potency: 0.8 }),
  ing({ id: 'fernet', name: 'Fernet', emoji: '🥃', category: 'liquidos', roles: ['liquido', 'aromatico'], families: ['herbal'], flavor: flavor({ amargo: 0.9, dulce: 0.2 }), potency: 1.5, step: 10, maxShare: 0.35 }),
  ing({ id: 'cola', name: 'Gaseosa cola', emoji: '🥤', category: 'liquidos', roles: ['liquido', 'endulzante'], flavor: flavor({ dulce: 0.8, acido: 0.3, amargo: 0.1 }), potency: 1 }),

  // Leudantes
  ing({ id: 'polvo_hornear', name: 'Polvo de hornear', emoji: '🫧', category: 'leudantes' }),
  ing({ id: 'levadura', name: 'Levadura', emoji: '🍞', category: 'leudantes', flavor: flavor({ umami: 0.2, amargo: 0.2 }), potency: 2 }),
  ing({ id: 'bicarbonato', name: 'Bicarbonato', emoji: '⚗️', category: 'leudantes', flavor: flavor({ salado: 0.4, amargo: 0.5 }), potency: 15, step: 1, maxShare: 0.008 }),
  ing({ id: 'gelatina', name: 'Gelatina sin sabor', emoji: '🍮', category: 'leudantes', roles: ['ligante'], flavor: flavor(), potency: 0.5, maxShare: 0.04 }),

  // Otros
  ing({ id: 'hongos_secos', name: 'Hongos secos', emoji: '🍄', category: 'otros', roles: ['aromatico', 'vegetal'], families: ['tierra'], flavor: flavor({ umami: 1, amargo: 0.1 }), potency: 3, step: 5, maxShare: 0.08 }),
];

export const CATALOG_BY_ID = new Map(CATALOG.map((i) => [i.id, i]));

/** Gramos equivalentes de una cantidad en la unidad del ingrediente. */
export function toGrams(ingredient: Ingredient, amount: number): number {
  if (ingredient.unit === 'u') return amount * ingredient.gramsPerUnit;
  return amount;
}

export function formatAmount(ingredient: Ingredient, amount: number): string {
  if (ingredient.unit === 'u') return `${amount} u.`;
  return `${amount} ${ingredient.unit}`;
}

/** Crea un ingrediente propio a partir de la plantilla de su categoría. */
export function makeCustomIngredient(
  partial: Partial<Ingredient> & Pick<Ingredient, 'name' | 'category'>,
): Ingredient {
  const t = CATEGORIES[partial.category].template;
  const slug = partial.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24);
  return {
    id: partial.id ?? `custom_${slug || 'ing'}_${Math.random().toString(36).slice(2, 6)}`,
    emoji: partial.emoji ?? CATEGORIES[partial.category].emoji,
    roles: [...t.roles],
    families: [...t.families],
    flavor: { ...t.flavor },
    potency: t.potency,
    unit: t.unit,
    gramsPerUnit: t.gramsPerUnit,
    step: t.step,
    maxShare: t.maxShare,
    ...partial,
    custom: true,
  };
}

/** Canasta aleatoria equilibrada: intenta cubrir varias categorías. */
export function randomBasket(size: number, pool: Ingredient[] = CATALOG, rng: () => number = Math.random): Ingredient[] {
  const shuffled = [...pool].sort(() => rng() - 0.5);
  const picked: Ingredient[] = [];
  const usedCats = new Set<Category>();
  // primera pasada: una por categoría
  for (const i of shuffled) {
    if (picked.length >= size) break;
    if (!usedCats.has(i.category)) {
      picked.push(i);
      usedCats.add(i.category);
    }
  }
  for (const i of shuffled) {
    if (picked.length >= size) break;
    if (!picked.includes(i)) picked.push(i);
  }
  return picked;
}
