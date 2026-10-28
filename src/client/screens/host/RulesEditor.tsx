import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { DISH_TYPES } from '../../../shared/dishes';
import { CATEGORIES } from '../../../shared/ingredients';
import { RULE_PRESETS } from '../../../shared/rules';
import type { Category, Ingredient, RoundRules } from '../../../shared/types';
import { CATEGORY_IDS } from '../../../shared/types';
import { Section, cx } from '../../components/common';

const TIME_OPTIONS = [
  { sec: 90, label: '1:30' },
  { sec: 180, label: '3 min' },
  { sec: 240, label: '4 min' },
  { sec: 300, label: '5 min' },
  { sec: 480, label: '8 min' },
  { sec: 0, label: 'Sin límite' },
];

interface Props {
  rules: RoundRules;
  basket: Ingredient[];
  onChange: (rules: RoundRules) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">{label}</div>
      {children}
      {hint && <p className="mt-1 text-xs text-tinta-soft">{hint}</p>}
    </div>
  );
}

export function RulesEditor({ rules, basket, onChange }: Props) {
  const [newRule, setNewRule] = useState('');
  const set = <K extends keyof RoundRules>(k: K, v: RoundRules[K]) => onChange({ ...rules, [k]: v });
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const wTotal = rules.weights.coherence + rules.weights.creativity + rules.weights.versatility || 1;
  const required = basket.filter((i) => rules.requiredIngredientIds.includes(i.id));

  const addRule = () => {
    const t = newRule.trim();
    if (!t || rules.customRules.length >= 8) return;
    set('customRules', [...rules.customRules, t.slice(0, 120)]);
    setNewRule('');
  };

  return (
    <Section title="Reglas de la ronda">
      <div className="space-y-5">
        <Field label="Desafíos rápidos" hint="Aplican un conjunto de reglas; después podés ajustarlas.">
          <div className="flex flex-wrap gap-1.5">
            {RULE_PRESETS.map((p) => (
              <button key={p.id} type="button" className="chip-off" title={p.description} onClick={() => onChange(p.apply(rules, basket))}>
                <span aria-hidden>{p.emoji}</span> {p.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Consigna" hint="La ven todos los cocineros arriba de la pantalla.">
          <textarea
            value={rules.theme}
            onChange={(e) => set('theme', e.target.value.slice(0, 140))}
            rows={2}
            className="w-full resize-none"
            placeholder="Ej.: Algo para compartir en una tarde de lluvia"
          />
        </Field>

        <Field label="Tiempo para cocinar">
          <div className="flex flex-wrap gap-1.5">
            {TIME_OPTIONS.map((t) => (
              <button key={t.sec} type="button" className={rules.timeLimitSec === t.sec ? 'chip-on' : 'chip-off'} onClick={() => set('timeLimitSec', t.sec)}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Tipo de plato" hint={rules.allowedDishTypes.length === 0 ? 'Sin marcar ninguno, vale cualquier tipo.' : undefined}>
          <div className="flex flex-wrap gap-1.5">
            {DISH_TYPES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={rules.allowedDishTypes.includes(d.id) ? 'chip-on' : 'chip-off'}
                onClick={() => set('allowedDishTypes', toggle(rules.allowedDishTypes, d.id))}
              >
                {d.emoji} {d.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Perfil">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-mantel p-1">
            {(
              [
                ['any', 'Cualquiera'],
                ['dulce', 'Dulce'],
                ['salado', 'Salado'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => set('requiredProfile', v)}
                className={cx(
                  'rounded-lg py-1.5 text-sm font-semibold',
                  rules.requiredProfile === v ? 'bg-white shadow-sm' : 'text-tinta-soft hover:text-tinta',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mínimo de ingredientes">
            <input
              type="number"
              min={1}
              max={30}
              value={rules.minIngredients}
              onChange={(e) => {
                const v = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                onChange({ ...rules, minIngredients: v, maxIngredients: Math.max(v, rules.maxIngredients) });
              }}
              className="w-full"
            />
          </Field>
          <Field label="Máximo de ingredientes">
            <input
              type="number"
              min={1}
              max={30}
              value={rules.maxIngredients}
              onChange={(e) => {
                const v = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                onChange({ ...rules, maxIngredients: v, minIngredients: Math.min(v, rules.minIngredients) });
              }}
              className="w-full"
            />
          </Field>
        </div>

        <Field label="Ingredientes obligatorios" hint="Se marcan tocando un ingrediente de la canasta.">
          {required.length === 0 ? (
            <p className="text-sm text-tinta-soft">Ninguno.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {required.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="chip border-tomate bg-tomate-soft text-tomate"
                  onClick={() => set('requiredIngredientIds', rules.requiredIngredientIds.filter((x) => x !== i.id))}
                  title="Quitar"
                >
                  {i.emoji} {i.name} <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Categorías prohibidas">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_IDS.filter((c) => c !== 'otros').map((c: Category) => (
              <button
                key={c}
                type="button"
                className={
                  rules.bannedCategories.includes(c) ? 'chip border-tomate bg-tomate text-white line-through' : 'chip-off'
                }
                onClick={() => set('bannedCategories', toggle(rules.bannedCategories, c))}
              >
                {CATEGORIES[c].emoji} {CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Peso total máximo (g)" hint="Vacío = sin límite.">
          <input
            type="number"
            min={50}
            step={50}
            value={rules.maxTotalGrams ?? ''}
            onChange={(e) => set('maxTotalGrams', e.target.value ? Math.max(50, Number(e.target.value)) : null)}
            className="w-40"
            placeholder="Sin límite"
          />
        </Field>

        <Field label="Reglas propias" hint="Las verificás vos al juzgar. Ej.: «el nombre tiene que rimar».">
          {rules.customRules.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {rules.customRules.map((r, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-mantel px-3 py-2 text-sm">
                  <span className="flex-1">{r}</span>
                  <button
                    type="button"
                    className="text-tinta-soft hover:text-tomate"
                    onClick={() => set('customRules', rules.customRules.filter((_, j) => j !== i))}
                    aria-label={`Quitar regla ${r}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {rules.customRules.length < 8 && (
            <div className="flex gap-2">
              <input
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRule();
                  }
                }}
                className="min-w-0 flex-1"
                placeholder="Escribí una regla"
              />
              <button type="button" className="btn-ghost px-3" onClick={addRule} disabled={!newRule.trim()} aria-label="Agregar regla">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </Field>

        <Field label="Cuánto pesa cada criterio en la nota">
          <div className="space-y-2">
            {(
              [
                ['coherence', 'Coherencia'],
                ['creativity', 'Creatividad'],
                ['versatility', 'Versatilidad'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span>{label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={rules.weights[k]}
                  onChange={(e) => set('weights', { ...rules.weights, [k]: Number(e.target.value) })}
                />
                <span className="text-right font-semibold num">{Math.round((rules.weights[k] / wTotal) * 100)}%</span>
              </label>
            ))}
            <p className="text-xs text-tinta-soft">La versatilidad cuenta desde la segunda ronda de cada jugador.</p>
          </div>
        </Field>

        <Field label="Penalización por regla incumplida">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={rules.penaltyPerViolation}
              onChange={(e) => set('penaltyPerViolation', Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-16 text-right text-sm font-semibold num">−{rules.penaltyPerViolation} pts</span>
          </div>
        </Field>
      </div>
    </Section>
  );
}
