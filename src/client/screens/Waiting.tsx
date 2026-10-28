import { CATALOG_BY_ID } from '../../shared/ingredients';
import { IngredientTile, PlayerList, RecipeCard, RoomCode, Section, TopBar } from '../components/common';
import { useGame } from '../store';

const PAN = ['huevo', 'harina', 'manteca', 'tomate', 'ajo', 'limon'].map((id) => CATALOG_BY_ID.get(id)!);

/** Jugador esperando que el juez arme la ronda. */
export function PlayerWaiting() {
  const view = useGame((s) => s.view)!;
  const next = view.roundNumber + 1;
  const last = view.history[view.history.length - 1];
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <section className="tiles overflow-hidden rounded-2xl px-6 py-8 text-white">
          <h1 className="text-3xl font-bold">{next === 1 ? '¡Estás adentro!' : `Se viene la ronda ${next}`}</h1>
          <p className="mt-2 max-w-prose text-white/85">
            {view.host.name} está armando la canasta y las reglas. Cuando empiece la ronda vas a ver los ingredientes y el
            reloj.
          </p>
          <div className="mt-6 grid max-w-sm grid-cols-6 gap-1.5" aria-hidden>
            {PAN.map((ing, i) => (
              <div key={ing.id} style={{ animation: `bob 1.4s ease-in-out ${i * 0.18}s infinite alternate` }}>
                <IngredientTile ing={ing} size="sm" />
              </div>
            ))}
          </div>
        </section>

        {last?.winner && (
          <Section title={`Ganó la ronda ${last.number}`}>
            <p>
              <strong>{last.winner.name}</strong> con «{last.winner.recipeName}», {last.winner.points} puntos.
            </p>
          </Section>
        )}

        <Section title="En la sala" aside={<span className="text-sm text-tinta-soft">Juez: {view.host.name}</span>}>
          <PlayerList players={view.players} showScores={view.roundNumber > 0} />
        </Section>

        <Section title="Sumá a alguien más">
          <RoomCode code={view.code} compact />
        </Section>
      </main>
    </div>
  );
}

/** Jugador esperando el veredicto. */
export function PlayerJudgingWait() {
  const view = useGame((s) => s.view)!;
  const sub = view.mySubmission;
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <section className="tiles rounded-2xl px-6 py-8 text-white">
          <h1 className="text-3xl font-bold">El juez está probando</h1>
          <p className="mt-2 text-white/85">
            {view.host.name} revisa cada plato. Los resultados aparecen acá apenas los publique.
          </p>
        </section>
        {sub ? (
          <RecipeCard
            recipe={sub.recipe}
            basket={view.config?.basket ?? []}
            title={<p className="mb-1 text-sm text-tinta-soft">Tu plato{sub.auto ? ' (se entregó al terminar el tiempo)' : ''}</p>}
          />
        ) : (
          <div className="panel p-6 text-center">
            <p className="font-semibold">No entregaste plato en esta ronda.</p>
            <p className="mt-1 text-tinta-soft">En la próxima, acordate de tocar «Entregar plato» antes de que termine el reloj.</p>
          </div>
        )}
      </main>
    </div>
  );
}
