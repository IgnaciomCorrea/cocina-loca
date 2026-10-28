import { AlertTriangle, Check, CheckCircle2, Copy, Info, LogOut, QrCode, WifiOff, X, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState, type ReactNode } from 'react';
import { DISH_BY_ID, TECHNIQUES } from '../../shared/dishes';
import { formatAmount, toGrams } from '../../shared/ingredients';
import type { Finding, Ingredient, PublicPlayer, Recipe, RuleCheck, ScorePart } from '../../shared/types';
import { useGame } from '../store';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

// ─── Azulejos de ingredientes ──────────────────────────────

interface TileProps {
  ing: Ingredient;
  selected?: boolean;
  amountLabel?: string;
  required?: boolean;
  banned?: boolean;
  onClick?: () => void;
  size?: 'md' | 'sm';
  title?: string;
}

export function IngredientTile({ ing, selected, amountLabel, required, banned, onClick, size = 'md', title }: TileProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title ?? ing.name}
      aria-pressed={onClick ? !!selected : undefined}
      className={cx(
        'relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] bg-mantel p-1.5 text-center',
        'shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)] transition-transform',
        onClick && 'cursor-pointer hover:-translate-y-0.5',
        selected && 'bg-yema-soft ring-4 ring-yema',
        banned && 'opacity-40 grayscale',
      )}
    >
      <span className={cx('leading-none', size === 'md' ? 'text-4xl' : 'text-2xl')} aria-hidden>
        {ing.emoji}
      </span>
      <span className={cx('line-clamp-2 leading-tight font-medium text-tinta', size === 'md' ? 'text-[13px]' : 'text-[11px]')}>
        {ing.name}
      </span>
      {required && (
        <span className="absolute top-1 left-1 rounded-full bg-tomate px-1.5 text-[10px] font-bold text-white" title="Obligatorio">
          ★
        </span>
      )}
      {ing.custom && (
        <span className="absolute top-1 right-1 rounded-full bg-azulejo px-1.5 text-[10px] font-bold text-white" title="Ingrediente especial del juez">
          ✦
        </span>
      )}
      {amountLabel && (
        <span className="animate-pop absolute -right-1.5 -bottom-1.5 rounded-full bg-tinta px-2 py-0.5 text-[11px] font-semibold text-white num">
          {amountLabel}
        </span>
      )}
    </Tag>
  );
}

export function TileWall({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('tiles rounded-2xl p-3', className)}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(86px,1fr))] gap-2.5">{children}</div>
    </div>
  );
}

// ─── Hallazgos y puntajes ──────────────────────────────────

const FINDING_STYLE = {
  good: { Icon: CheckCircle2, cls: 'text-albahaca' },
  warn: { Icon: AlertTriangle, cls: 'text-yema-dark' },
  bad: { Icon: XCircle, cls: 'text-tomate' },
  info: { Icon: Info, cls: 'text-tinta-soft' },
} as const;

export function Findings({ items, empty }: { items: Finding[]; empty?: string }) {
  if (items.length === 0) return empty ? <p className="text-sm text-tinta-soft">{empty}</p> : null;
  return (
    <ul className="space-y-1.5">
      {items.map((f, i) => {
        const { Icon, cls } = FINDING_STYLE[f.level];
        return (
          <li key={i} className="flex gap-2 text-sm leading-snug">
            <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', cls)} aria-hidden />
            <span>{f.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function scoreColor(v: number) {
  if (v >= 70) return 'bg-albahaca';
  if (v >= 45) return 'bg-yema';
  return 'bg-tomate';
}

export function Meter({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const p = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-junta', className)}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', scoreColor(p))} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Parts({ parts }: { parts: ScorePart[] }) {
  return (
    <dl className="space-y-1.5">
      {parts.map((p) => (
        <div key={p.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-tinta-soft">{p.label}</dt>
          <dd className={cx('font-semibold num', p.score < 0 && 'text-tomate')}>
            {p.max > 0 ? `${p.score}/${p.max}` : p.score}
          </dd>
          {p.max > 0 && <Meter value={p.score} max={p.max} className="col-span-2 h-1.5" />}
        </div>
      ))}
    </dl>
  );
}

// ─── Reglas ────────────────────────────────────────────────

export function RuleList({ checks, custom }: { checks: RuleCheck[]; custom?: string[] }) {
  return (
    <ul className="space-y-1.5">
      {checks.map((c) => (
        <li key={c.id} className="flex gap-2 text-sm leading-snug">
          {c.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-albahaca" aria-label="Cumple" />
          ) : (
            <X className="mt-0.5 h-4 w-4 shrink-0 text-tomate" aria-label="No cumple" />
          )}
          <span className={cx(!c.ok && 'font-medium')}>
            {c.label}
            {c.detail && <span className="text-tinta-soft"> ({c.detail})</span>}
          </span>
        </li>
      ))}
      {custom?.map((r, i) => (
        <li key={`c${i}`} className="flex gap-2 text-sm leading-snug">
          <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs leading-4 text-azulejo" aria-hidden>
            ✎
          </span>
          <span>
            {r} <span className="text-tinta-soft">(la evalúa el juez)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Receta ────────────────────────────────────────────────

export function RecipeCard({ recipe, basket, title }: { recipe: Recipe; basket: Ingredient[]; title?: ReactNode }) {
  const dish = DISH_BY_ID.get(recipe.dishTypeId);
  const byId = new Map(basket.map((i) => [i.id, i]));
  const rows = recipe.items
    .map((it) => ({ it, ing: byId.get(it.ingredientId) }))
    .filter((r): r is { it: Recipe['items'][number]; ing: Ingredient } => !!r.ing && r.it.amount > 0);
  const total = rows.reduce((a, r) => a + toGrams(r.ing, r.it.amount), 0);
  return (
    <article className="panel overflow-hidden">
      <header className="border-b-2 border-junta px-5 pt-4 pb-3">
        {title}
        <h3 className="text-2xl leading-tight font-bold">{recipe.name || 'Sin nombre'}</h3>
        <p className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-azulejo-soft px-2.5 py-0.5 font-medium text-azulejo-dark">
            {dish ? `${dish.emoji} ${dish.name}` : 'Plato'}
          </span>
          <span className="rounded-full bg-mantel px-2.5 py-0.5 text-tinta-soft">
            {TECHNIQUES[recipe.technique]?.emoji} {TECHNIQUES[recipe.technique]?.label}
          </span>
        </p>
      </header>
      {recipe.description && <p className="border-b-2 border-junta px-5 py-3 text-[15px] leading-relaxed italic">{recipe.description}</p>}
      <ul className="divide-y divide-junta">
        {rows.map(({ it, ing }) => {
          const share = total ? toGrams(ing, it.amount) / total : 0;
          return (
            <li key={ing.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-2 px-5 py-2">
              <span className="text-xl" aria-hidden>
                {ing.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{ing.name}</span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-junta">
                  <span className="block h-full bg-azulejo" style={{ width: `${Math.max(2, share * 100)}%` }} />
                </span>
              </span>
              <span className="text-right text-sm num">
                <span className="font-semibold">{formatAmount(ing, it.amount)}</span>
                <span className="block text-xs text-tinta-soft">{share < 0.01 ? '<1' : Math.round(share * 100)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
      <footer className="px-5 py-2 text-right text-xs text-tinta-soft num">Total aprox. {Math.round(total)} g</footer>
    </article>
  );
}

// ─── Sala y jugadores ──────────────────────────────────────

export function joinLink(code: string) {
  return `${window.location.origin}/?sala=${code}`;
}

export function RoomCode({ code, compact }: { code: string; compact?: boolean }) {
  const [qr, setQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = joinLink(code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sin portapapeles */
    }
  };
  return (
    <div className={cx('flex flex-wrap items-center gap-2', compact ? '' : 'gap-3')}>
      <div className={cx('rounded-xl bg-white font-extrabold tracking-[0.18em] text-azulejo num', compact ? 'px-3 py-1 text-xl' : 'px-4 py-2 text-3xl')}>
        {code}
      </div>
      <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={copy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copiado' : 'Copiar link'}
      </button>
      <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setQr((v) => !v)} aria-expanded={qr}>
        <QrCode className="h-4 w-4" /> QR
      </button>
      {qr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 p-6"
          onClick={() => setQr(false)}
          role="dialog"
          aria-label="Código QR para unirse"
        >
          <div className="panel flex flex-col items-center gap-4 p-8" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG value={link} size={260} fgColor="#1d2b28" />
            <p className="text-center">
              Escaneá para unirte a la sala <strong className="tracking-widest">{code}</strong>
            </p>
            <button type="button" className="btn-dark" onClick={() => setQr(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_TEXT: Record<PublicPlayer['status'], string> = {
  esperando: 'En la sala',
  cocinando: 'Cocinando',
  entregado: 'Entregó',
  sin_entregar: 'No entregó',
};

export function PlayerList({
  players,
  showScores,
  showProgress,
  onKick,
}: {
  players: PublicPlayer[];
  showScores?: boolean;
  showProgress?: boolean;
  onKick?: (p: PublicPlayer) => void;
}) {
  if (players.length === 0) {
    return <p className="text-sm text-tinta-soft">Todavía no se unió nadie. Compartí el código de la sala.</p>;
  }
  return (
    <ul className="divide-y-2 divide-junta">
      {players.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-2">
          <span
            className={cx('h-2.5 w-2.5 shrink-0 rounded-full', p.connected ? 'bg-albahaca' : 'bg-junta')}
            title={p.connected ? 'Conectado' : 'Desconectado'}
          />
          <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
          {showProgress && (
            <span
              className={cx(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                p.status === 'entregado' ? 'bg-albahaca-soft text-albahaca' : 'bg-mantel text-tinta-soft',
                p.status === 'sin_entregar' && 'bg-tomate-soft text-tomate',
              )}
            >
              {STATUS_TEXT[p.status]}
              {p.status === 'cocinando' && p.draftCount > 0 && ` (${p.draftCount} ingr.)`}
            </span>
          )}
          {showScores && <span className="font-semibold num">{p.score} pts</span>}
          {onKick && (
            <button
              type="button"
              className="rounded-md p-1 text-tinta-soft hover:bg-tomate-soft hover:text-tomate"
              onClick={() => onKick(p)}
              title={`Sacar a ${p.name}`}
              aria-label={`Sacar a ${p.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── Marco general ─────────────────────────────────────────

export function TopBar({ right }: { right?: ReactNode }) {
  const view = useGame((s) => s.view)!;
  const leave = useGame((s) => s.leave);
  const onLeave = () => {
    const msg = view.me.isHost
      ? '¿Cerrar la sala? Todos los jugadores van a salir.'
      : '¿Salir de la sala? Vas a perder tu puntaje.';
    if (window.confirm(msg)) leave();
  };
  return (
    <header className="tiles text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="text-lg font-extrabold tracking-tight">🍳 Cocina Loca</span>
        <span className="rounded-lg bg-white/15 px-2 py-0.5 font-bold tracking-[0.15em] num">{view.code}</span>
        {view.roundNumber > 0 && (
          <span className="text-sm text-white/80">
            Ronda {view.roundNumber}
            {view.settings.plannedRounds ? ` de ${view.settings.plannedRounds}` : ''}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {right}
          <span className="text-sm text-white/80">
            {view.me.isHost ? '⚖️ ' : '👩‍🍳 '}
            {view.me.name}
          </span>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
            title={view.me.isHost ? 'Cerrar sala' : 'Salir'}
            aria-label={view.me.isHost ? 'Cerrar sala' : 'Salir'}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const connected = useGame((s) => s.connected);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {!connected && (
        <div className="flex items-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm text-white shadow-lg">
          <WifiOff className="h-4 w-4" /> Sin conexión con el servidor. Reintentando…
        </div>
      )}
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'animate-pop rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg',
            t.tone === 'error' ? 'bg-tomate text-white' : 'bg-tinta text-white',
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Section({ title, children, aside, className }: { title: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cx('panel p-4 sm:p-5', className)}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
