import type { Recipe, RoomSettings, RoomView, RoundConfig, Verdict } from './types';

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

export type AckResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
export type Ack<T = object> = (res: AckResult<T>) => void;

/** Eventos que envía el cliente. */
export interface ClientToServerEvents {
  'room:create': (p: { name: string }, ack: Ack<{ session: Session }>) => void;
  'room:join': (p: { code: string; name: string }, ack: Ack<{ session: Session }>) => void;
  'room:resume': (p: Session, ack: Ack) => void;
  'room:leave': () => void;

  'host:settings': (p: Partial<RoomSettings>, ack: Ack) => void;
  'host:config': (p: RoundConfig, ack: Ack) => void;
  'host:start': (ack: Ack) => void;
  'host:extend': (p: { seconds: number }, ack: Ack) => void;
  'host:endCooking': (ack: Ack) => void;
  'host:verdict': (p: { submissionId: string; verdict: Verdict }, ack: Ack) => void;
  'host:publish': (ack: Ack) => void;
  'host:next': (ack: Ack) => void;
  'host:finish': (ack: Ack) => void;
  'host:newGame': (ack: Ack) => void;
  'host:kick': (p: { playerId: string }, ack: Ack) => void;

  'player:draft': (p: Recipe) => void;
  'player:submit': (p: Recipe, ack: Ack) => void;
  'player:unsubmit': (ack: Ack) => void;
}

/** Eventos que envía el servidor. */
export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  'room:kicked': () => void;
  'room:closed': (reason: string) => void;
}

export interface SocketData {
  code?: string;
  playerId?: string;
}
