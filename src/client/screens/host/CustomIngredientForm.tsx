import { useMemo, useState, type FormEvent } from 'react';
import { CATEGORIES, FAMILY_LABELS, ROLE_LABELS, makeCustomIngredient } from '../../../shared/ingredients';
import type { Category, Family, Flavor, Ingredient, Role, Unit } from '../../../shared/types';
import { CATEGORY_IDS, FAMILY_IDS, FLAVOR_KEYS, ROLE_IDS } from '../../../shared/types';
import { cx } from '../../components/common';

const FLAVOR_LABEL: Record<keyof Flavor, string> = {
  dulce: 'Dulce',
  salado: 'Salado',
  acido: 'Ácido',
  amargo: 'Amargo',
  umami: 'Umami',
  picante: 'Picante',
};

const INTENSITY = [
  { label: 'Suave', factor: 0.5 },
  { label: 'Normal', factor: 1 },
  { label: 'Fuerte', factor: 2 },
  { label: 'Muy fuerte', factor: 4 },
];

export function CustomIngredientForm({ onAdd, onCancel }: { onAdd: (i: Ingredient) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [category, setCategory] = useState<Category>('otros');
  const template = CATEGORIES[category].template;
  const [roles, setRoles] = useState<Role[]>(template.roles);
  const [families, setFamilies] = useState<Family[]>(template.families);
  const [flavor, setFlavor] = useState<Flavor>(template.flavor);
  const [unit, setUnit] = useState<Unit>(template.unit);
  const [gramsPerUnit, setGramsPerUnit] = useState(50);
  const [intensity, setIntensity] = useState(1);
  const [maxPct, setMaxPct] = useState(Math.round(template.maxShare * 100));

  const pickCategory = (c: Category) => {
    const t = CATEGORIES[c].template;
    setCategory(c);
    setRoles(t.roles);
    setFamilies(t.families);
    setFlavor(t.flavor);
    setUnit(t.unit);
    setMaxPct(Math.max(1, Math.round(t.maxShare * 100)));
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const preview = useMemo(
    () =>
      makeCustomIngredient({
        name: name.trim() || 'Ingrediente',
        category,
        emoji: emoji.trim() || undefined,
        roles,
        families,
        flavor,
        unit,
        gramsPerUnit: unit === 'u' ? gramsPerUnit : 1,
        step: unit === 'u' ? 1 : CATEGORIES[category].template.step,
        potency: CATEGORIES[category].template.potency * INTENSITY[intensity].factor,
        maxShare: maxPct / 100,
      }),
    [name, category, emoji, roles, families, flavor, unit, gramsPerUnit, intensity, maxPct],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(preview);
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border-2 border-dashed border-azulejo/40 bg-azulejo-soft/40 p-4">
      <p className="text-sm text-tinta-soft">
        Los datos de sabor y función le permiten al juego analizar recetas que usen este ingrediente. Al elegir la
        categoría se completan valores típicos que podés ajustar.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_5rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} className="w-full" placeholder="Ej.: Dulce de batata" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Emoji</span>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-full text-center text-xl" placeholder={CATEGORIES[category].emoji} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Categoría</span>
        <select value={category} onChange={(e) => pickCategory(e.target.value as Category)} className="w-full">
          {CATEGORY_IDS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c].emoji} {CATEGORIES[c].label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Qué aporta a una receta</legend>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_IDS.map((r) => (
            <button key={r} type="button" className={roles.includes(r) ? 'chip-on' : 'chip-off'} onClick={() => setRoles(toggle(roles, r))}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Sabor</legend>
        <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {FLAVOR_KEYS.map((k) => (
            <label key={k} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-sm">
              <span>{FLAVOR_LABEL[k]}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={flavor[k]}
                onChange={(e) => setFlavor({ ...flavor, [k]: Number(e.target.value) })}
              />
              <span className="text-right text-tinta-soft num">{Math.round(flavor[k] * 10)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Intensidad del sabor</legend>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1">
          {INTENSITY.map((it, i) => (
            <button
              key={it.label}
              type="button"
              onClick={() => setIntensity(i)}
              className={cx('rounded-lg py-1.5 text-sm font-medium', intensity === i ? 'bg-azulejo text-white' : 'text-tinta-soft hover:bg-mantel')}
            >
              {it.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Combina con (familias de sabor)</legend>
        <div className="flex flex-wrap gap-1.5">
          {FAMILY_IDS.map((f) => (
            <button key={f} type="button" className={families.includes(f) ? 'chip-on' : 'chip-off'} onClick={() => setFamilies(toggle(families, f))}>
              {FAMILY_LABELS[f]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Se mide en</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="w-full">
            <option value="g">Gramos</option>
            <option value="ml">Mililitros</option>
            <option value="u">Unidades</option>
          </select>
        </label>
        {unit === 'u' && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Gramos por unidad</span>
            <input type="number" min={1} max={5000} value={gramsPerUnit} onChange={(e) => setGramsPerUnit(Number(e.target.value) || 1)} className="w-full" />
          </label>
        )}
      </div>

      <label className="block">
        <span className="mb-1 flex justify-between text-sm font-semibold">
          Cantidad máxima razonable en un plato <span className="num">{maxPct}%</span>
        </span>
        <input type="range" min={1} max={100} value={maxPct} onChange={(e) => setMaxPct(Number(e.target.value))} className="w-full" />
        <span className="text-xs text-tinta-soft">Por encima de esto el análisis lo marca como exceso (la sal ronda el 2%).</span>
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn-dark" disabled={!name.trim()}>
          Agregar a la canasta
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
