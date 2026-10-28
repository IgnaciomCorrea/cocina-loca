import { useState, type FormEvent } from 'react';
import { CATALOG_BY_ID } from '../../shared/ingredients';
import { IngredientTile, cx } from '../components/common';
import { useGame } from '../store';

const SHOWCASE = ['huevo', 'tomate', 'chocolate', 'limon', 'ajo', 'frutilla', 'queso_rallado', 'aji_molido', 'miel', 'albahaca']
  .map((id) => CATALOG_BY_ID.get(id)!)
  .filter(Boolean);

export function Home() {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState((params.get('sala') ?? '').toUpperCase().slice(0, 4));
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'join' | 'host'>('join');
  const [busy, setBusy] = useState(false);
  const { join, create, resume, resumable, notice, dismissNotice, connected } = useGame();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = mode === 'join' ? await join(code, name.trim()) : await create(name.trim());
    setBusy(false);
    if (ok && params.has('sala')) window.history.replaceState(null, '', '/');
  };

  return (
    <div className="tiles flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-10 lg:flex-row lg:items-center lg:gap-16">
        <div className="text-white lg:flex-1">
          <h1 className="text-6xl leading-[0.9] font-extrabold tracking-tight sm:text-7xl">Cocina Loca</h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/85">
            Un juego de cocina para jugar en grupo. El juez arma la canasta y las reglas; ustedes inventan el plato más
            original que tenga sentido.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-5 gap-2" aria-hidden>
            {SHOWCASE.map((ing, i) => (
              <div key={ing.id} className={cx(i % 3 === 1 && 'translate-y-2')}>
                <IngredientTile ing={ing} size="sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md lg:flex-none">
          {notice && (
            <div className="mb-3 flex items-start gap-3 rounded-xl bg-yema px-4 py-3 text-tinta">
              <p className="flex-1 text-sm font-medium">{notice}</p>
              <button type="button" className="text-sm underline" onClick={dismissNotice}>
                Entendido
              </button>
            </div>
          )}

          {resumable && (
            <button
              type="button"
              className="btn-primary mb-3 w-full"
              onClick={() => resume(resumable)}
              disabled={!connected}
            >
              Volver a la sala {resumable.code}
              {resumable.name ? ` como ${resumable.name}` : ''}
            </button>
          )}

          <form onSubmit={submit} className="panel p-6 shadow-[0_6px_0_rgba(0,0,0,0.15)]">
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-mantel p-1" role="tablist">
              {(
                [
                  ['join', 'Unirme a una sala'],
                  ['host', 'Crear sala como juez'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cx(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    mode === m ? 'bg-white text-tinta shadow-sm' : 'text-tinta-soft hover:text-tinta',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'join' && (
              <label className="mb-4 block">
                <span className="mb-1.5 block text-sm font-semibold">Código de la sala</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                  placeholder="ABCD"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="w-full text-center text-2xl font-bold tracking-[0.4em] uppercase"
                  required
                  minLength={4}
                />
              </label>
            )}

            <label className="mb-5 block">
              <span className="mb-1.5 block text-sm font-semibold">Tu nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                placeholder={mode === 'join' ? 'Cómo te van a ver los demás' : 'Así te van a ver como juez'}
                autoComplete="nickname"
                className="w-full"
                required
              />
            </label>

            <button type="submit" className="btn-dark w-full py-3 text-lg" disabled={busy || !connected || !name.trim()}>
              {mode === 'join' ? 'Entrar a la sala' : 'Crear sala'}
            </button>

            {mode === 'host' && (
              <p className="mt-4 text-sm leading-relaxed text-tinta-soft">
                Como juez armás la canasta, definís las reglas de cada ronda y das la nota final. El juego te muestra un
                análisis de cada plato para ayudarte a decidir.
              </p>
            )}
            {!connected && <p className="mt-4 text-sm text-tomate">Conectando con el servidor…</p>}
          </form>
        </div>
      </main>
    </div>
  );
}
