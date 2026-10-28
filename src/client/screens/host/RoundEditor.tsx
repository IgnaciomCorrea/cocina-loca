import type { RoundRules } from '../../../shared/types';
import { Section } from '../../components/common';

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

export function RoundEditor({ rules, onChange }: Props) {
  const set = <K extends keyof RoundRules>(k: K, v: RoundRules[K]) => onChange({ ...rules, [k]: v });

  return (
    <Section title="Ronda">
      <div className="space-y-5">
        <Field label="Consigna" hint="La ven todos los cocineros arriba de la pantalla. Es opcional.">
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
      </div>
    </Section>
  );
}
