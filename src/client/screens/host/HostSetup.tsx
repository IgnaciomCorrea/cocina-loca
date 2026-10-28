import { Flag, Play } from 'lucide-react';
import { useState } from 'react';
import type { RoundConfig } from '../../../shared/types';
import { PlayerList, RoomCode, Section, TopBar } from '../../components/common';
import { useDebouncedSync } from '../../hooks';
import { act, useGame } from '../../store';
import { BasketEditor } from './BasketEditor';
import { RulesEditor } from './RulesEditor';

export function HostSetup() {
  const view = useGame((s) => s.view)!;
  // Se edita localmente y se sincroniza con el servidor (así sobrevive a una recarga)
  const [config, setConfig] = useState<RoundConfig>(() => view.config!);
  const [starting, setStarting] = useState(false);
  useDebouncedSync(config, 400, (c) => void act('host:config', c));

  const nextRound = view.roundNumber + 1;
  const cooks = view.players;
  const problems: string[] = [];
  if (config.basket.length < 3) problems.push('Agregá al menos 3 ingredientes a la canasta.');
  if (cooks.length === 0) problems.push('Esperá a que se una al menos un cocinero.');
  if (config.rules.minIngredients > config.basket.length) problems.push('El mínimo de ingredientes supera el tamaño de la canasta.');

  const start = async () => {
    setStarting(true);
    // Primero se asegura de que el servidor tenga la última versión
    const saved = await act('host:config', config);
    if (saved) await act('host:start');
    setStarting(false);
  };

  const toggleRequired = (id: string) => {
    setConfig((prev) => {
      const req = prev.rules.requiredIngredientIds;
      return { ...prev, rules: { ...prev.rules, requiredIngredientIds: req.includes(id) ? req.filter((x) => x !== id) : [...req, id] } };
    });
  };

  return (
    <div className="min-h-dvh pb-28">
      <TopBar />
      <main className="mx-auto grid grid-cols-1 max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          {view.roundNumber === 0 && (
            <div className="rounded-2xl bg-yema-soft px-5 py-4">
              <h1 className="text-xl font-bold">Prepará la primera ronda</h1>
              <p className="mt-1 max-w-prose text-[15px] leading-relaxed">
                Armá la canasta y las reglas mientras se suman los cocineros. Ellos no ven nada hasta que empiece la ronda.
              </p>
            </div>
          )}
          <BasketEditor
            basket={config.basket}
            required={config.rules.requiredIngredientIds}
            roundNumber={nextRound}
            onChange={(update) =>
              setConfig((prev) => {
                const basket = update(prev.basket);
                return {
                  basket,
                  rules: {
                    ...prev.rules,
                    requiredIngredientIds: prev.rules.requiredIngredientIds.filter((id) => basket.some((i) => i.id === id)),
                  },
                };
              })
            }
            onToggleRequired={toggleRequired}
          />
        </div>

        <aside className="space-y-4">
          <Section title="Sala">
            <RoomCode code={view.code} />
            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold">
                Cocineros <span className="font-normal text-tinta-soft num">({cooks.length})</span>
              </div>
              <PlayerList
                players={cooks}
                showScores={view.roundNumber > 0}
                onKick={(p) => {
                  if (window.confirm(`¿Sacar a ${p.name} de la sala?`)) void act('host:kick', { playerId: p.id });
                }}
              />
            </div>
          </Section>

          <RulesEditor rules={config.rules} basket={config.basket} onChange={(rules) => setConfig((prev) => ({ ...prev, rules }))} />

          <Section title="Partida">
            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={view.settings.anonymousJudging}
                  onChange={(e) => void act('host:settings', { anonymousJudging: e.target.checked })}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-semibold">Juzgar a ciegas</span>
                  <span className="block text-tinta-soft">Ves «Plato A, B, C» en vez de los nombres hasta publicar.</span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={view.settings.showHints}
                  onChange={(e) => void act('host:settings', { showHints: e.target.checked })}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-semibold">Pistas para los cocineros</span>
                  <span className="block text-tinta-soft">Les avisa si algo parece incoherente (sin mostrar puntajes).</span>
                </span>
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">Rondas previstas</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={view.settings.plannedRounds}
                  onChange={(e) => void act('host:settings', { plannedRounds: Number(e.target.value) || 1 })}
                  className="w-20 text-center"
                />
              </label>
              {view.roundNumber > 0 && (
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() => {
                    if (window.confirm('¿Terminar la partida y mostrar el podio?')) void act('host:finish');
                  }}
                >
                  <Flag className="h-4 w-4" /> Terminar partida y ver podio
                </button>
              )}
            </div>
          </Section>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-junta bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-tinta-soft">
            {problems[0] ?? `${config.basket.length} ingredientes y ${cooks.length} ${cooks.length === 1 ? 'cocinero' : 'cocineros'} listos.`}
          </p>
          <button type="button" className="btn-primary px-6 py-3 text-lg" onClick={start} disabled={problems.length > 0 || starting}>
            <Play className="h-5 w-5" /> Empezar ronda {nextRound}
          </button>
        </div>
      </div>
    </div>
  );
}
