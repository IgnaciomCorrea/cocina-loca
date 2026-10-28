import { Gavel, TimerReset } from 'lucide-react';
import { checkRules } from '../../../shared/rules';
import { emptyRecipe } from '../../../shared/sanitize';
import { IngredientTile, PlayerList, RoomCode, RuleList, Section, TileWall, TopBar, cx } from '../../components/common';
import { formatClock, useServerNow } from '../../hooks';
import { act, useGame } from '../../store';

export function HostCooking() {
  const view = useGame((s) => s.view)!;
  const now = useServerNow();
  const config = view.config!;
  const remaining = view.endsAt ? view.endsAt - now : null;
  const delivered = view.players.filter((p) => p.status === 'entregado').length;
  const allIn = view.players.length > 0 && delivered === view.players.length;
  // Reglas expresadas como lista (sin evaluar una receta concreta)
  const ruleLabels = checkRules({ ...emptyRecipe(), name: 'x' }, config.rules, config.basket).filter((c) => c.id !== 'nombre' && c.id !== 'canasta');

  return (
    <div className="min-h-dvh pb-10">
      <TopBar />
      <section className="tiles text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-6 px-4 pt-4 pb-8">
          <div className="min-w-0 flex-1">
            <p className="text-white/75">Ronda {view.roundNumber}: se está cocinando</p>
            <h1 className="mt-1 max-w-3xl text-3xl leading-tight font-bold sm:text-4xl">
              {config.rules.theme || 'Tema libre'}
            </h1>
          </div>
          <div className="text-right">
            <div
              className={cx(
                'text-7xl leading-none font-extrabold num sm:text-8xl',
                remaining !== null && remaining < 15000 && 'text-yema',
              )}
              aria-live="off"
            >
              {remaining === null ? '∞' : formatClock(remaining)}
            </div>
            <p className="mt-1 text-white/75">{remaining === null ? 'Sin límite de tiempo' : 'Tiempo restante'}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto mt-5 grid grid-cols-1 max-w-7xl gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Section title="Canasta">
            <TileWall>
              {config.basket.map((ing) => (
                <IngredientTile key={ing.id} ing={ing} required={config.rules.requiredIngredientIds.includes(ing.id)} />
              ))}
            </TileWall>
          </Section>
          <Section title="Reglas">
            <RuleList checks={ruleLabels.map((c) => ({ ...c, ok: true, detail: undefined }))} custom={config.rules.customRules} />
          </Section>
        </div>

        <aside className="space-y-4">
          <Section
            title="Cocineros"
            aside={
              <span className="text-sm font-semibold num">
                {delivered}/{view.players.length} entregaron
              </span>
            }
          >
            <PlayerList players={view.players} showProgress />
          </Section>

          <Section title="Control">
            <div className="space-y-3">
              {view.endsAt !== null && (
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost flex-1" onClick={() => act('host:extend', { seconds: 30 })}>
                    <TimerReset className="h-4 w-4" /> +30 s
                  </button>
                  <button type="button" className="btn-ghost flex-1" onClick={() => act('host:extend', { seconds: 60 })}>
                    <TimerReset className="h-4 w-4" /> +1 min
                  </button>
                </div>
              )}
              <button
                type="button"
                className={cx('w-full py-3', allIn ? 'btn-primary' : 'btn-dark')}
                onClick={() => {
                  if (allIn || window.confirm('Todavía hay cocineros trabajando. Sus borradores con ingredientes se entregan tal como están. ¿Cerrar la cocina?'))
                    void act('host:endCooking');
                }}
              >
                <Gavel className="h-5 w-5" /> {allIn ? 'Todos entregaron: pasar a juzgar' : 'Cerrar la cocina y juzgar'}
              </button>
            </div>
          </Section>

          <Section title="Para sumar gente">
            <RoomCode code={view.code} compact />
          </Section>
        </aside>
      </main>
    </div>
  );
}
