import { create } from 'zustand';
import type { Session } from '../shared/protocol';
import type { RoomView } from '../shared/types';
import { request, socket, type ArgsOf, type EventsWithAck } from './socket';

const TAB_KEY = 'cocina-loca:tab-session';
const LAST_KEY = 'cocina-loca:last-session';

function read(storage: Storage, key: string): (Session & { name?: string }) | null {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(session: (Session & { name?: string }) | null) {
  try {
    if (session) {
      sessionStorage.setItem(TAB_KEY, JSON.stringify(session));
      localStorage.setItem(LAST_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(TAB_KEY);
      localStorage.removeItem(LAST_KEY);
    }
  } catch {
    /* almacenamiento no disponible */
  }
}

interface Toast {
  id: number;
  text: string;
  tone: 'error' | 'info';
}

interface GameState {
  connected: boolean;
  view: RoomView | null;
  session: Session | null;
  /** Sesión de otra pestaña o visita anterior, para ofrecer volver. */
  resumable: (Session & { name?: string }) | null;
  clockOffset: number;
  toasts: Toast[];
  notice: string | null;
  create: (name: string) => Promise<boolean>;
  join: (code: string, name: string) => Promise<boolean>;
  resume: (s: Session) => Promise<boolean>;
  leave: () => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissNotice: () => void;
}

export const useGame = create<GameState>((set, get) => ({
  connected: socket.connected,
  view: null,
  // Si esta pestaña ya estaba en una sala, se reconecta apenas haya conexión
  session: read(sessionStorage, TAB_KEY),
  resumable: read(sessionStorage, TAB_KEY) ? null : read(localStorage, LAST_KEY),
  clockOffset: 0,
  toasts: [],
  notice: null,

  async create(name) {
    const res = await request('room:create', { name });
    if (!res.ok) return get().toast(res.error), false;
    write({ ...res.session, name });
    set({ session: res.session, resumable: null });
    return true;
  },

  async join(code, name) {
    const res = await request('room:join', { code, name });
    if (!res.ok) return get().toast(res.error), false;
    write({ ...res.session, name });
    set({ session: res.session, resumable: null });
    return true;
  },

  async resume(s) {
    const res = await request('room:resume', s);
    if (!res.ok) {
      write(null);
      set({ session: null, view: null, resumable: null });
      get().toast(res.error);
      return false;
    }
    write(s);
    set({ session: s, resumable: null });
    return true;
  },

  leave() {
    socket.emit('room:leave');
    write(null);
    set({ session: null, view: null });
  },

  toast(text, tone = 'error') {
    const id = Date.now() + Math.random();
    set((st) => ({ toasts: [...st.toasts, { id, text, tone }] }));
    setTimeout(() => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })), 4500);
  },

  dismissNotice() {
    set({ notice: null });
  },
}));

// ─── Eventos del socket ────────────────────────────────────

socket.on('connect', () => {
  useGame.setState({ connected: true });
  // Reconexión automática (recarga de página o caída de red)
  const s = useGame.getState().session ?? read(sessionStorage, TAB_KEY);
  if (s) void useGame.getState().resume(s);
});

socket.on('disconnect', () => useGame.setState({ connected: false }));

socket.on('room:state', (view) => {
  useGame.setState({ view, clockOffset: view.serverNow - Date.now() });
});

socket.on('room:kicked', () => {
  write(null);
  useGame.setState({ session: null, view: null, notice: 'El juez te sacó de la sala.' });
});

socket.on('room:closed', (reason) => {
  write(null);
  useGame.setState({ session: null, view: null, notice: reason });
});

/** Envía una acción y muestra el error si falla. */
export async function act<K extends EventsWithAck>(event: K, ...args: ArgsOf<K>): Promise<boolean> {
  const res = (await request(event, ...args)) as { ok: boolean; error?: string };
  if (!res.ok) useGame.getState().toast(res.error ?? 'Algo salió mal.');
  return res.ok;
}
