import { ChevronDown, Flag, PartyPopper, RotateCcw, SkipForward } from 'lucide-react';
import { useState } from 'react';
import { AWARDS } from '../../shared/types';
import type { Ingredient, ResultEntry, RoundRules } from '../../shared/types';
import { Findings, Meter, PlayerList, RecipeCard, Section, TopBar, cx } from '../components/common';
import { act, useGame } from '../store';

const MEDAL = ['🥇', '🥈', '🥉'];

function award(id: string | null) {
  return AWARDS.find((a) => a.id === id);
}

function Breakdown({ e, rules, basket }: { e: ResultEntry; rules: RoundRules; basket: Ingredient[] }) {
  const v = e.verdict;
  const customFails = v.customRuleChecks.filter((ok) => !ok).length;
  const penalty = (e.analysis.violations + customFails) * rules.penaltyPerViolation;
  const rows: Array<[string, number | null]> = [
    ['Coherencia', v.coherence],
    ['Creatividad', v.creativity],
    ['Versatilidad', v.versatility],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <dl className="space-y-2">
          {rows.map(([label, val]) => (
            <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
              <dt>{label}</dt>
              <dd className="font-semibold num">{val ?? '—'}</dd>
              {val !== null && <Meter value={val} className="col-span-2" />}
            </div>
          ))}
          {v.bonus !== 0 && (
            <div className="flex justify-between text-sm">
              <dt>Extra del juez</dt>
              <dd className={cx('font-semibold num', v.bonus < 0 && 'text-tomate')}>{v.bonus > 0 ? `+${v.bonus}` : v.bonus}</dd>
            </div>
          )}
          {penalty > 0 && (
            <div className="flex justify-between text-sm text-tomate">
              <dt>Reglas incumplidas</dt>
              <dd className="font-semibold num">−{penalty}</dd>
            </div>
          )}
        </dl>
        <div>
          <h4 className="mb-1.5 text-sm font-semibold">Lo que vio el análisis</h4>
          <Findings
            items={[...e.analysis.coherence.findings, ...e.analysis.creativity.findings]
              .filter((f) => f.level !== 'info')
              .slice(0, 6)}
          />
        </div>
      </div>
      <RecipeCard recipe={e.recipe} basket={basket} />
    </div>
  );
}

function ResultRow({ e, mine, rules, basket }: { e: ResultEntry; mine: boolean; rules: RoundRules; basket: Ingredient[] }) {
  const [open, setOpen] = useState(mine);
  const a = award(e.verdict.award);
  return (
    <li className={cx('panel overflow-hidden', mine && 'border-yema')}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-4 px-4 py-3 text-left">
        <span className="w-10 text-center text-2xl font-extrabold num">{MEDAL[e.rank - 1] ?? e.rank}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {e.playerName}
            {mine && <span className="ml-2 rounded-full bg-yema px-2 py-0.5 text-xs">Vos</span>}
          </span>
          <span className="block truncate text-sm text-tinta-soft">{e.recipe.name}</span>
        </span>
        {a && (
          <span className="hidden rounded-full bg-azulejo-soft px-2.5 py-1 text-sm font-medium text-azulejo-dark sm:inline">
            {a.emoji} {a.label}
          </span>
        )}
        <span className="text-2xl font-extrabold num">{e.points}</span>
        <ChevronDown className={cx('h-5 w-5 text-tinta-soft transition-transform', open && 'rotate-180')} />
      </button>
      {(e.verdict.comment || (a && open)) && (
        <div className="px-4 pb-3">
          {a && <p className="mb-1 text-sm font-medium text-azulejo-dark sm:hidden">{a.emoji} {a.label}</p>}
          {e.verdict.comment && (
            <blockquote className="rounded-xl bg-mantel px-4 py-2.5 text-[15px] leading-relaxed">
              «{e.verdict.comment}»
            </blockquote>
          )}
        </div>
      )}
      {open && (
        <div className="border-t-2 border-junta p-4">
          <Breakdown e={e} rules={rules} basket={basket} />
        </div>
      )}
    </li>
  );
}

export function Results() {
  const view = useGame((s) => s.view)!;
  const results = view.results ?? [];
  const rules = view.config!.rules;
  const winner = results[0];
  const isHost = view.me.isHost;
  const planned = view.settings.plannedRounds;
  const lastPlanned = view.roundNumber >= planned;
  const standings = [...view.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-dvh pb-24">
      <TopBar />
      <section className="tiles text-white">
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-8">
          <p className="text-white/75">Resultados de la ronda {view.roundNumber}</p>
          {winner ? (
            <>
              <h1 className="mt-1 text-4xl leading-tight font-extrabold sm:text-5xl">
                {winner.playerName} gana con «{winner.recipe.name}»
              </h1>
              <p className="mt-2 text-lg text-white/85 num">{winner.points} puntos</p>
            </>
          ) : (
            <h1 className="mt-1 text-4xl font-extrabold">Nadie entregó un plato</h1>
          )}
        </div>
      </section>

      <main className="mx-auto grid grid-cols-1 max-w-5xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ol className="min-w-0 space-y-3">
          {results.map((e) => (
            <ResultRow key={e.submissionId} e={e} mine={e.playerId === view.me.id} rules={rules} basket={view.config!.basket} />
          ))}
        </ol>
        <aside className="space-y-4">
          <Section title="Tabla general">
            <PlayerList players={standings} showScores />
          </Section>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-junta bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-3">
          {isHost ? (
            <>
              <p className="mr-auto text-sm text-tinta-soft">
                {lastPlanned ? `Ya se jugaron las ${planned} rondas previstas.` : `Van ${view.roundNumber} de ${planned} rondas.`}
              </p>
              <button
                type="button"
                className={lastPlanned ? 'btn-ghost' : 'btn-primary px-6 py-3 text-lg'}
                onClick={() => act('host:next')}
              >
                <SkipForward className="h-5 w-5" /> Preparar ronda {view.roundNumber + 1}
              </button>
              <button
                type="button"
                className={lastPlanned ? 'btn-primary px-6 py-3 text-lg' : 'btn-ghost'}
                onClick={() => act('host:finish')}
              >
                <Flag className="h-5 w-5" /> Terminar partida
              </button>
            </>
          ) : (
            <p className="mr-auto text-sm text-tinta-soft">Esperando a que {view.host.name} prepare lo que sigue.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Final() {
  const view = useGame((s) => s.view)!;
  const standings = [...view.players].sort((a, b) => b.score - a.score);
  const podium = standings.slice(0, 3);
  // Orden visual del podio: 2º, 1º, 3º
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  const heights: Record<number, string> = { 0: 'h-40', 1: 'h-28', 2: 'h-20' };

  return (
    <div className="min-h-dvh pb-24">
      <TopBar />
      <section className="tiles text-white">
        <div className="mx-auto max-w-4xl px-4 pt-8 pb-0 text-center">
          <PartyPopper className="mx-auto h-10 w-10 text-yema" aria-hidden />
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
            {podium[0] ? `${podium[0].name} es la cocina más loca` : 'Fin de la partida'}
          </h1>
          <p className="mt-2 text-white/80">
            {view.history.length} {view.history.length === 1 ? 'ronda jugada' : 'rondas jugadas'}
          </p>
          <div className="mt-8 flex items-end justify-center gap-3">
            {order.map((p) => {
              const place = standings.indexOf(p);
              return (
                <div key={p.id} className="w-28 sm:w-36">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="text-sm text-white/80 num">{p.score} pts</p>
                  <div
                    className={cx(
                      'mt-2 flex items-start justify-center rounded-t-xl pt-3 text-4xl',
                      heights[place],
                      place === 0 ? 'bg-yema' : 'bg-white/20',
                    )}
                  >
                    {MEDAL[place]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto grid grid-cols-1 max-w-4xl gap-4 px-4 py-6 md:grid-cols-2">
        <Section title="Tabla final">
          <PlayerList players={standings} showScores />
        </Section>
        <Section title="Ganadores por ronda">
          {view.history.length === 0 ? (
            <p className="text-sm text-tinta-soft">No se jugaron rondas.</p>
          ) : (
            <ol className="divide-y-2 divide-junta">
              {view.history.map((h) => (
                <li key={h.number} className="py-2">
                  <p className="text-sm text-tinta-soft">
                    Ronda {h.number}
                    {h.theme ? `: ${h.theme}` : ''}
                  </p>
                  <p className="font-medium">
                    {h.winner ? (
                      <>
                        {h.winner.name} con «{h.winner.recipeName}» <span className="text-tinta-soft num">({h.winner.points} pts)</span>
                      </>
                    ) : (
                      'Sin platos'
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </main>

      {view.me.isHost && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-junta bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-3 px-4 py-3">
            <p className="mr-auto text-sm text-tinta-soft">Los mismos jugadores siguen en la sala.</p>
            <button
              type="button"
              className="btn-primary px-6 py-3 text-lg"
              onClick={() => {
                if (window.confirm('¿Empezar una partida nueva? Los puntajes vuelven a cero.')) void act('host:newGame');
              }}
            >
              <RotateCcw className="h-5 w-5" /> Jugar otra partida
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
