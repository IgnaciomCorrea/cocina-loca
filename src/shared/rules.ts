import type { RoundRules } from './types';

export const DEFAULT_RULES: RoundRules = {
  theme: '',
  timeLimitSec: 240,
};

/** Normaliza y acota la configuración de ronda recibida desde un cliente. */
export function sanitizeRules(input: Partial<RoundRules>): RoundRules {
  const r = { ...DEFAULT_RULES, ...input };
  const sec = Math.round(Number(r.timeLimitSec));
  return {
    theme: String(r.theme ?? '').slice(0, 140),
    timeLimitSec: Number.isFinite(sec) ? Math.min(3600, Math.max(0, sec)) : DEFAULT_RULES.timeLimitSec,
  };
}
