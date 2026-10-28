import { io, type Socket } from 'socket.io-client';
import type { AckResult, ClientToServerEvents, ServerToClientEvents } from '../shared/protocol';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Mismo origen: en desarrollo Vite redirige /socket.io al servidor
export const socket: GameSocket = io({ autoConnect: true, transports: ['websocket', 'polling'] });

export type EventsWithAck = {
  [K in keyof ClientToServerEvents]: Parameters<ClientToServerEvents[K]> extends [...infer _A, (res: AckResult<infer _T>) => void]
    ? K
    : never;
}[keyof ClientToServerEvents];

export type ArgsOf<K extends EventsWithAck> = Parameters<ClientToServerEvents[K]> extends [...infer A, (res: AckResult<infer _T>) => void] ? A : never;
type ResultOf<K extends EventsWithAck> = Parameters<ClientToServerEvents[K]> extends [...infer _A, (res: infer R) => void] ? R : never;

/** Emite un evento y espera la confirmación del servidor. */
export function request<K extends EventsWithAck>(event: K, ...args: ArgsOf<K>): Promise<ResultOf<K>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'El servidor no respondió. Revisá la conexión.' } as ResultOf<K>), 8000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket.emit as any)(event, ...args, (res: ResultOf<K>) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}
