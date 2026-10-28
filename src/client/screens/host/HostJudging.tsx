import { Check, Megaphone, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { pointsFromVerdict, verdictFromSuggestion } from '../../../shared/scoring';
import type { Analysis, Flavor, JudgingEntry, RoundRules, Verdict } from '../../../shared/types';
import { AWARDS, FLAVOR_KEYS } from '../../../shared/types';
import { Findings, Meter, Parts, RecipeCard, RuleList, TopBar, cx } from '../../components/common';
import { act, useGame } from '../../store';

const FLAVOR_LABEL: Record<keyof Flavor, string> = {
  dulce: 'Dulce',
  salado: 'Salado',
  acido: 'Ácido',
  amargo: 'Amargo',
  umami: 'Umami',
  picante: 'Picante',
};

export function HostJudging() {
  const view = useGame((s) => s.view)!;
  const entries = view.judging ?? [];
  const config = view.config!;
  const [selected, setSelected] = useState<string | null>(entries[0]?.submissionId ?? null);
  const current = entries.find((e) => e.submissionId === selected) ?? entries[0];
  const reviewed = entries.filter((e) => e.verdict).length;

  const publish = () => {
    const pending = entries.length - reviewed;
    const msg =
      pending > 0
        ? `Hay ${pending} ${pending === 1 ? 'plato sin revisar' : 'platos sin revisar'}: se usará la nota sugerida. ¿Publicar resultados?`
        : '¿Publicar resultados? Todos van a ver las notas y tus comentarios.';
    if (window.confirm(msg)) void act('host:publish');
  };

  const goNext = () => {
    const idx = entries.findIndex((e) => e.submissionId === current?.submissionId);
    const after = [...entries.slice(idx + 1), ...entries.slice(0, idx)].find((e) => !e.verdict && e.submissionId !== current?.submissionId);
    if (after) setSelected(after.submissionId);
  };

  return (
    <div className="min-h-dvh pb-24">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-5">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Hora de probar</h1>
          <p className="mt-1 max-w-prose text-tinta-soft">
            El análisis automático es una guía: ajustá cada criterio con tu criterio de juez, sumá o restá puntos y dejá un
            comentario.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-lg font-semibold">Nadie entregó un plato en esta ronda.</p>
            <p className="mt-1 text-tinta-soft">Publicá los resultados para pasar a la siguiente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-label="Platos entregados" className="lg:sticky lg:top-4 lg:self-start">
              <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {entries.map((e) => {
                  const active = e.submissionId === current?.submissionId;
                  return (
                    <li key={e.submissionId} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelected(e.submissionId)}
                        aria-current={active}
                        className={cx(
                          'w-full min-w-44 rounded-xl border-2 px-3 py-2.5 text-left transition-colors',
                          active ? 'border-azulejo bg-azulejo text-white' : 'border-junta bg-white hover:border-tinta-soft',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-bold">{e.playerName ?? e.alias}</span>
                          {e.verdict && (
                            <Check className={cx('h-4 w-4', active ? 'text-yema' : 'text-albahaca')} aria-label="Revisado" />
                          )}
                          <span className={cx('ml-auto text-sm font-semibold num', active ? 'text-white' : 'text-tinta-soft')}>
                            {e.verdict ? `${pointsFromVerdict(e.verdict, e.analysis, config.rules)} pts` : `sugerido ${e.analysis.suggested.total}`}
                          </span>
                        </span>
                        <span className={cx('block truncate text-sm', active ? 'text-white/80' : 'text-tinta-soft')}>
                          {e.recipe.name || 'Sin nombre'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {current && (
              <div key={current.submissionId} className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 space-y-4">
                  <RecipeCard
                    recipe={current.recipe}
                    basket={config.basket}
                    title={
                      <p className="mb-1 text-sm text-tinta-soft">
                        {current.playerName ? `De ${current.playerName}` : current.alias}
                        {current.auto && ' (entregado al terminarse el tiempo)'}
                      </p>
                    }
                  />
                  <div className="panel p-4">
                    <h3 className="mb-2 font-bold">Reglas</h3>
                    <RuleList checks={current.analysis.ruleChecks} />
                    {current.analysis.violations > 0 && (
                      <p className="mt-2 text-sm text-tomate">
                        −{current.analysis.violations * config.rules.penaltyPerViolation} pts por{' '}
                        {current.analysis.violations === 1 ? 'una regla incumplida' : `${current.analysis.violations} reglas incumplidas`}
                      </p>
                    )}
                  </div>
                  <FlavorProfile flavor={current.analysis.coherence.flavor} />
                </div>
                <div className="min-w-0 space-y-4">
                  <AnalysisPanel analysis={current.analysis} />
                  <VerdictForm entry={current} rules={config.rules} onSaved={goNext} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-junta bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold num">
              {reviewed} de {entries.length} platos revisados
            </p>
            <Meter value={reviewed} max={Math.max(1, entries.length)} className="mt-1 max-w-xs" />
          </div>
          <button type="button" className="btn-primary px-6 py-3 text-lg" onClick={publish}>
            <Megaphone className="h-5 w-5" /> Publicar resultados
          </button>
        </div>
      </div>
    </div>
  );
}

function FlavorProfile({ flavor }: { flavor: Flavor }) {
  return (
    <div className="panel p-4">
      <h3 className="mb-3 font-bold">Perfil de sabor estimado</h3>
      <dl className="grid grid-cols-[4.5rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
        {FLAVOR_KEYS.map((k) => (
          <div key={k} className="contents">
            <dt className="text-tinta-soft">{FLAVOR_LABEL[k]}</dt>
            <dd className="h-2.5 overflow-hidden rounded-full bg-junta">
              <div className="h-full rounded-full bg-azulejo" style={{ width: `${Math.round(flavor[k] * 100)}%` }} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ScoreHeader({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h3 className="font-bold">{label}</h3>
      {note && <span className="text-xs text-tinta-soft">{note}</span>}
      <span className="ml-auto text-2xl font-extrabold num">{value ?? '—'}</span>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: Analysis }) {
  const { coherence, creativity, versatility, suggested } = analysis;
  return (
    <section className="panel divide-y-2 divide-junta" aria-label="Análisis automático">
      <div className="flex items-center gap-4 p-4">
        <div>
          <h2 className="text-lg font-bold">Análisis automático</h2>
          <p className="text-sm text-tinta-soft">Nota sugerida con los pesos de esta ronda</p>
        </div>
        <div className="ml-auto text-5xl font-extrabold text-azulejo num">{suggested.total}</div>
      </div>
      <details className="group p-4" open>
        <summary className="cursor-pointer list-none">
          <ScoreHeader label="Coherencia" value={coherence.score} />
          <Meter value={coherence.score} className="mt-2" />
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Parts parts={coherence.parts} />
          <Findings items={coherence.findings} />
        </div>
      </details>
      <details className="p-4" open>
        <summary className="cursor-pointer list-none">
          <ScoreHeader
            label="Creatividad"
            value={creativity.score}
            note={creativity.coherenceFactor < 1 ? `${creativity.raw} × ${Math.round(creativity.coherenceFactor * 100)}% por coherencia` : undefined}
          />
          <Meter value={creativity.score} className="mt-2" />
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Parts parts={creativity.parts} />
          <Findings items={creativity.findings} />
        </div>
      </details>
      <details className="p-4" open={versatility !== null}>
        <summary className="cursor-pointer list-none">
          <ScoreHeader label="Versatilidad" value={versatility?.score ?? null} note={versatility ? undefined : 'Primera receta de este jugador'} />
          {versatility && <Meter value={versatility.score} className="mt-2" />}
        </summary>
        {versatility && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Parts parts={versatility.parts} />
            <Findings items={versatility.findings} />
          </div>
        )}
      </details>
    </section>
  );
}

function Slider({
  label,
  value,
  suggested,
  onChange,
  min = 0,
  max = 100,
  signed,
}: {
  label: string;
  value: number;
  suggested?: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  signed?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        {suggested !== undefined && suggested !== value && (
          <button type="button" className="inline-flex items-center gap-1 text-xs text-azulejo underline" onClick={() => onChange(suggested)}>
            <RotateCcw className="h-3 w-3" /> Sugerido: {suggested}
          </button>
        )}
        <span className="ml-auto text-lg font-bold num">{signed && value > 0 ? `+${value}` : value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" aria-label={label} />
    </div>
  );
}

function VerdictForm({ entry, rules, onSaved }: { entry: JudgingEntry; rules: RoundRules; onSaved: () => void }) {
  // El componente se monta de nuevo al cambiar de plato (key), así que el estado inicial alcanza
  const [v, setV] = useState<Verdict>(() => entry.verdict ?? verdictFromSuggestion(entry.analysis, rules));
  const [saving, setSaving] = useState(false);
  const points = pointsFromVerdict(v, entry.analysis, rules);
  const s = entry.analysis.suggested;
  const set = <K extends keyof Verdict>(k: K, val: Verdict[K]) => setV((prev) => ({ ...prev, [k]: val }));

  const save = async () => {
    setSaving(true);
    const ok = await act('host:verdict', { submissionId: entry.submissionId, verdict: v });
    setSaving(false);
    if (ok) onSaved();
  };

  return (
    <section className="panel space-y-4 border-azulejo p-4" aria-label="Tu nota">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">Tu nota</h2>
        {entry.verdict && <span className="rounded-full bg-albahaca-soft px-2 py-0.5 text-xs font-semibold text-albahaca">Guardada</span>}
        <span className="ml-auto text-4xl font-extrabold num">{points}</span>
      </div>

      <Slider label="Coherencia" value={v.coherence} suggested={s.coherence} onChange={(x) => set('coherence', x)} />
      <Slider label="Creatividad" value={v.creativity} suggested={s.creativity} onChange={(x) => set('creativity', x)} />
      {v.versatility !== null && (
        <Slider label="Versatilidad" value={v.versatility} suggested={s.versatility ?? undefined} onChange={(x) => set('versatility', x)} />
      )}
      <Slider label="Puntos extra del juez" value={v.bonus} min={-20} max={20} signed onChange={(x) => set('bonus', x)} />

      {rules.customRules.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Tus reglas</legend>
          <ul className="space-y-1.5">
            {rules.customRules.map((r, i) => {
              const ok = v.customRuleChecks[i] !== false;
              return (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="flex-1">{r}</span>
                  <div className="grid grid-cols-2 rounded-lg bg-mantel p-0.5">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => set('customRuleChecks', rules.customRules.map((_, j) => (j === i ? val : v.customRuleChecks[j] !== false)))}
                        className={cx(
                          'rounded-md px-2.5 py-1 text-xs font-semibold',
                          ok === val ? (val ? 'bg-albahaca text-white' : 'bg-tomate text-white') : 'text-tinta-soft',
                        )}
                      >
                        {val ? 'Cumple' : 'No cumple'}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Mención especial</legend>
        <div className="flex flex-wrap gap-1.5">
          {AWARDS.map((a) => (
            <button key={a.id} type="button" className={v.award === a.id ? 'chip-on' : 'chip-off'} onClick={() => set('award', v.award === a.id ? null : a.id)}>
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Comentario para el cocinero</span>
        <textarea
          value={v.comment}
          onChange={(e) => set('comment', e.target.value.slice(0, 280))}
          rows={3}
          className="w-full resize-none"
          placeholder="Qué te gustó, qué cambiarías"
        />
      </label>

      <button type="button" className="btn-dark w-full py-3" onClick={save} disabled={saving}>
        <Check className="h-5 w-5" /> Guardar nota
      </button>
    </section>
  );
}
