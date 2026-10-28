import { useEffect, useRef, useState } from 'react';
import { useGame } from './store';

/** Hora del servidor, actualizada varias veces por segundo. */
export function useServerNow(active = true): number {
  const offset = useGame((s) => s.clockOffset);
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(id);
  }, [offset, active]);
  return now;
}

/** Ejecuta `fn` cuando `value` deja de cambiar durante `ms`. Omite el valor inicial. */
export function useDebouncedSync<T>(value: T, ms: number, fn: (v: T) => void) {
  const first = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => fnRef.current(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
