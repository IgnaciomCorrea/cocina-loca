import { Plus, Search, Shuffle, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATALOG, CATEGORIES, randomBasket } from '../../../shared/ingredients';
import type { Category, Ingredient } from '../../../shared/types';
import { CATEGORY_IDS } from '../../../shared/types';
import { IngredientTile, Section, TileWall, cx } from '../../components/common';
import { CustomIngredientForm } from './CustomIngredientForm';

interface Props {
  basket: Ingredient[];
  required: string[];
  roundNumber: number;
  /** Recibe una función para evitar perder cambios con clics rápidos. */
  onChange: (update: (basket: Ingredient[]) => Ingredient[]) => void;
  onToggleRequired: (id: string) => void;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function BasketEditor({ basket, required, roundNumber, onChange, onToggleRequired }: Props) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | null>(null);
  const [randomSize, setRandomSize] = useState(12);
  const [creating, setCreating] = useState(false);
  const inBasket = new Set(basket.map((i) => i.id));

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return CATALOG.filter((i) => (!cat || i.category === cat) && (!q || normalize(i.name).includes(q)));
  }, [query, cat]);

  const toggle = (ing: Ingredient) => {
    onChange((prev) => (prev.some((i) => i.id === ing.id) ? prev.filter((i) => i.id !== ing.id) : [...prev, ing]));
  };

  const randomize = () => {
    onChange((prev) => {
      const custom = prev.filter((i) => i.custom);
      return [...custom, ...randomBasket(Math.max(3, randomSize - custom.length))];
    });
  };

  return (
    <div className="space-y-4">
      <Section
        title={`Canasta de la ronda ${roundNumber}`}
        aside={<span className="text-sm text-tinta-soft num">{basket.length} ingredientes</span>}
      >
        {basket.length === 0 ? (
          <div className="tiles flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center text-white">
            <p className="font-medium">La canasta está vacía.</p>
            <p className="max-w-sm text-sm text-white/80">Elegí ingredientes del catálogo de abajo o armá una canasta al azar.</p>
          </div>
        ) : (
          <TileWall>
            {basket.map((ing) => (
              <div key={ing.id} className="group relative">
                <IngredientTile
                  ing={ing}
                  required={required.includes(ing.id)}
                  onClick={() => onToggleRequired(ing.id)}
                  title={required.includes(ing.id) ? `${ing.name}: obligatorio (tocá para quitar)` : `${ing.name}: tocá para hacerlo obligatorio`}
                />
                <button
                  type="button"
                  onClick={() => toggle(ing)}
                  className="absolute -top-1.5 -right-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-tinta text-white shadow group-hover:flex group-focus-within:flex max-sm:flex"
                  aria-label={`Sacar ${ing.name} de la canasta`}
                  title="Sacar de la canasta"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </TileWall>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm text-tinta-soft">
            Tocá un ingrediente para marcarlo <span className="font-semibold text-tomate">★ obligatorio</span>.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-tinta-soft">Al azar</span>
            <input
              type="number"
              min={3}
              max={40}
              value={randomSize}
              onChange={(e) => setRandomSize(Math.min(40, Math.max(3, Number(e.target.value) || 3)))}
              className="w-16 py-1.5 text-center"
              aria-label="Cantidad de ingredientes al azar"
            />
          </label>
          <button type="button" className="btn-ghost py-2 text-sm" onClick={randomize}>
            <Shuffle className="h-4 w-4" /> Armar al azar
          </button>
          {basket.length > 0 && (
            <button type="button" className="btn-danger py-2 text-sm" onClick={() => onChange(() => [])}>
              <Trash2 className="h-4 w-4" /> Vaciar
            </button>
          )}
        </div>
      </Section>

      <Section
        title="Catálogo de ingredientes"
        aside={
          !creating && (
            <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Crear ingrediente
            </button>
          )
        }
      >
        {creating && (
          <div className="mb-4">
            <CustomIngredientForm
              onAdd={(ing) => {
                onChange((prev) => [...prev, ing]);
                setCreating(false);
              }}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-tinta-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ingrediente"
            className="w-full pl-9"
            aria-label="Buscar ingrediente"
          />
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button type="button" className={cat === null ? 'chip-on' : 'chip-off'} onClick={() => setCat(null)}>
            Todos
          </button>
          {CATEGORY_IDS.filter((c) => CATALOG.some((i) => i.category === c)).map((c) => (
            <button key={c} type="button" className={cat === c ? 'chip-on' : 'chip-off'} onClick={() => setCat(cat === c ? null : c)}>
              {CATEGORIES[c].emoji} {CATEGORIES[c].label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2">
          {filtered.map((ing) => (
            <IngredientTile
              key={ing.id}
              ing={ing}
              size="sm"
              selected={inBasket.has(ing.id)}
              onClick={() => toggle(ing)}
              title={inBasket.has(ing.id) ? `Sacar ${ing.name}` : `Agregar ${ing.name}`}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className={cx('text-sm text-tinta-soft')}>
            No hay ingredientes con ese nombre. Podés crearlo con «Crear ingrediente».
          </p>
        )}
      </Section>
    </div>
  );
}
