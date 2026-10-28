import { Minus, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DISH_BY_ID, DISH_TYPES, TECHNIQUES } from '../../../shared/dishes';
import { toGrams } from '../../../shared/ingredients';
import { checkRules } from '../../../shared/rules';
import { emptyRecipe } from '../../../shared/sanitize';
import { draftHints } from '../../../shared/scoring';
import type { Ingredient, Recipe, Technique } from '../../../shared/types';
import { TECHNIQUE_IDS } from '../../../shared/types';
import { Findings, IngredientTile, RecipeCard, RuleList, TileWall, TopBar, cx } from '../../components/common';
import { formatClock, useDebouncedSync, useServerNow } from '../../hooks';
import { socket } from '../../socket';
import { act, useGame } from '../../store';

function defaultAmount(ing: Ingredient) {
  if (ing.unit === 'u') return 1;
  return ing.step * (ing.maxShare <= 0.03 ? 2 : 4);
}

function unitLabel(ing: Ingredient) {
  return ing.unit === 'u' ? 'u.' : ing.unit;
}

export function PlayerCooking() {
  const view = useGame((s) => s.view)!;
  const config = view.config!;
  const { rules, basket } = config;
  const allowedDishes = rules.allowedDishTypes.length ? DISH_TYPES.filter((d) => rules.allowedDishTypes.includes(d.id)) : DISH_TYPES;
  const [recipe, setRecipe] = useState<Recipe>(
    () => view.mySubmission?.recipe ?? view.myDraft ?? emptyRecipe(allowedDishes[0]?.id),
  );
  const submitted = !!view.mySubmission;
  const now = useServerNow();
  const remaining = view.endsAt ? view.endsAt - now : null;

  useDebouncedSync(recipe, 600, (r) => {
    if (!submitted) socket.emit('player:draft', r);
  });

  const byId = useMemo(() => new Map(basket.map((i) => [i.id, i])), [basket]);
  const dish = DISH_BY_ID.get(recipe.dishTypeId)!;
  const checks = checkRules(recipe, rules, basket);
  const hints = view.settings.showHints ? draftHints(recipe, basket) : [];
  const amountOf = (id: string) => recipe.items.find((i) => i.ingredientId === id)?.amount;
  const total = recipe.items.reduce((a, it) => a + (byId.get(it.ingredientId) ? toGrams(byId.get(it.ingredientId)!, it.amount) : 0), 0);

  const toggleIngredient = (ing: Ingredient) => {
    setRecipe((r) =>
      r.items.some((i) => i.ingredientId === ing.id)
        ? { ...r, items: r.items.filter((i) => i.ingredientId !== ing.id) }
        : { ...r, items: [...r.items, { ingredientId: ing.id, amount: defaultAmount(ing) }] },
    );
  };
  const setAmount = (id: string, amount: number) => {
    const clean = Math.max(0, Math.min(100000, Math.round(amount * 10) / 10));
    setRecipe((r) => ({ ...r, items: r.items.map((i) => (i.ingredientId === id ? { ...i, amount: clean } : i)) }));
  };
  const pickDish = (id: string) => {
    const d = DISH_BY_ID.get(id)!;
    setRecipe((r) => ({ ...r, dishTypeId: id, technique: d.techniques.includes(r.technique) ? r.technique : d.techniques[0] }));
  };

  const submit = async () => {
    const failing = checks.filter((c) => !c.ok);
    if (failing.length && !window.confirm(`Tu plato no cumple ${failing.length === 1 ? 'una regla' : `${failing.length} reglas`} y va a perder puntos. ¿Entregar igual?`)) return;
    await act('player:submit', recipe);
  };

  const techniques: Technique[] = [...dish.techniques, ...TECHNIQUE_IDS.filter((t) => !dish.techniques.includes(t))];

  return (
    <div className="min-h-dvh pb-28">
      <TopBar />
      <div className="sticky top-0 z-30 bg-azulejo-dark text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <p className="min-w-0 flex-1 truncate font-semibold">{rules.theme || 'Tema libre'}</p>
          <span
            className={cx(
              'rounded-lg px-3 py-1 text-xl font-extrabold num',
              remaining !== null && remaining < 15000 ? 'bg-yema text-tinta' : 'bg-white/15',
            )}
          >
            {remaining === null ? 'Sin límite' : formatClock(remaining)}
          </span>
        </div>
      </div>

      {submitted ? (
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          <div className="rounded-2xl bg-albahaca-soft px-5 py-4">
            <h1 className="text-xl font-bold text-albahaca">Plato entregado</h1>
            <p className="mt-1">Mientras quede tiempo podés volver a editarlo.</p>
          </div>
          <RecipeCard recipe={view.mySubmission!.recipe} basket={basket} />
          <button type="button" className="btn-ghost w-full" onClick={() => act('player:unsubmit')}>
            <Pencil className="h-4 w-4" /> Seguir editando
          </button>
        </main>
      ) : (
        <main className="mx-auto grid grid-cols-1 max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-4">
            <section className="panel space-y-4 p-4 sm:p-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Nombre del plato</span>
                <input
                  value={recipe.name}
                  onChange={(e) => { const name = e.target.value.slice(0, 60); setRecipe((r) => ({ ...r, name })); }}
                  className="w-full text-lg font-semibold"
                  placeholder="Ponele un nombre que se recuerde"
                />
              </label>
              <div>
                <div className="mb-1.5 text-sm font-semibold">Qué vas a cocinar</div>
                <div className="flex flex-wrap gap-1.5">
                  {allowedDishes.map((d) => (
                    <button key={d.id} type="button" className={recipe.dishTypeId === d.id ? 'chip-on' : 'chip-off'} onClick={() => pickDish(d.id)} title={d.description}>
                      {d.emoji} {d.name}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-tinta-soft">{dish.description}</p>
              </div>
              <div>
                <div className="mb-1.5 text-sm font-semibold">Técnica</div>
                <div className="flex flex-wrap gap-1.5">
                  {techniques.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={cx(recipe.technique === t ? 'chip-on' : 'chip-off', !dish.techniques.includes(t) && recipe.technique !== t && 'opacity-60')}
                      onClick={() => setRecipe((r) => ({ ...r, technique: t }))}
                    >
                      {TECHNIQUES[t].emoji} {TECHNIQUES[t].label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-baseline gap-3 px-1">
                <h2 className="text-lg font-bold">Canasta</h2>
                <p className="text-sm text-tinta-soft">Tocá para sumar o sacar un ingrediente.</p>
              </div>
              <TileWall>
                {basket.map((ing) => {
                  const amount = amountOf(ing.id);
                  const banned = rules.bannedCategories.includes(ing.category);
                  return (
                    <IngredientTile
                      key={ing.id}
                      ing={ing}
                      selected={amount !== undefined}
                      amountLabel={amount !== undefined ? `${amount} ${unitLabel(ing)}` : undefined}
                      required={rules.requiredIngredientIds.includes(ing.id)}
                      banned={banned}
                      onClick={() => toggleIngredient(ing)}
                      title={banned ? `${ing.name} (categoría prohibida en esta ronda)` : ing.name}
                    />
                  );
                })}
              </TileWall>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="panel p-4 sm:p-5">
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-lg font-bold">Ingredientes y cantidades</h2>
                <span className="ml-auto text-sm text-tinta-soft num">{Math.round(total)} g</span>
              </div>
              {recipe.items.length === 0 ? (
                <p className="text-sm text-tinta-soft">Todavía no elegiste ingredientes.</p>
              ) : (
                <ul className="space-y-2">
                  {recipe.items.map((it) => {
                    const ing = byId.get(it.ingredientId);
                    if (!ing) return null;
                    return (
                      <li key={it.ingredientId} className="flex items-center gap-2">
                        <span className="text-2xl" aria-hidden>
                          {ing.emoji}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{ing.name}</span>
                        <div className="flex items-center rounded-lg border-2 border-junta">
                          <button
                            type="button"
                            className="p-1.5 text-tinta-soft hover:text-tinta"
                            onClick={() => setAmount(ing.id, it.amount - ing.step)}
                            aria-label={`Menos ${ing.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={ing.step}
                            value={it.amount}
                            onChange={(e) => setAmount(ing.id, Number(e.target.value) || 0)}
                            className="w-16 rounded-none border-0 px-1 py-1 text-center num"
                            aria-label={`Cantidad de ${ing.name} en ${unitLabel(ing)}`}
                          />
                          <button
                            type="button"
                            className="p-1.5 text-tinta-soft hover:text-tinta"
                            onClick={() => setAmount(ing.id, it.amount + ing.step)}
                            aria-label={`Más ${ing.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="w-6 text-xs text-tinta-soft">{unitLabel(ing)}</span>
                        <button
                          type="button"
                          className="p-1 text-tinta-soft hover:text-tomate"
                          onClick={() => toggleIngredient(ing)}
                          aria-label={`Sacar ${ing.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-semibold">Cómo se prepara (opcional)</span>
                <textarea
                  value={recipe.description}
                  onChange={(e) => { const description = e.target.value.slice(0, 400); setRecipe((r) => ({ ...r, description })); }}
                  rows={3}
                  className="w-full resize-none"
                  placeholder="Contale al juez la idea detrás del plato"
                />
              </label>
            </section>

            <section className="panel p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold">Reglas</h2>
              <RuleList checks={checks} custom={rules.customRules} />
            </section>

            {hints.length > 0 && (
              <section className="rounded-2xl border-2 border-yema bg-yema-soft p-4 sm:p-5">
                <h2 className="mb-2 font-bold">Ojo con esto</h2>
                <Findings items={hints} />
              </section>
            )}
          </aside>
        </main>
      )}

      {!submitted && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-junta bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-tinta-soft">
              {recipe.items.length} {recipe.items.length === 1 ? 'ingrediente' : 'ingredientes'}
              {checks.some((c) => !c.ok) && <span className="text-tomate">, faltan reglas por cumplir</span>}
            </p>
            <button type="button" className="btn-primary px-6 py-3 text-lg" onClick={submit} disabled={recipe.items.length === 0}>
              <Send className="h-5 w-5" /> Entregar plato
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
