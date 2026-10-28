import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import type { Ack, ClientToServerEvents, ServerToClientEvents, Session, SocketData } from '../shared/protocol';
import { sanitizeName } from '../shared/sanitize';
import { GameError, GameRoom } from './room';

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
const http = createServer(app);
const io: IO = new Server(http, { cors: { origin: true } });

const rooms = new Map<string, GameRoom>();

// ─── Archivos del cliente (producción) ─────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const clientDir = [join(here, 'client'), join(here, '../../dist/client')].find((d) => existsSync(join(d, 'index.html')));
app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});
if (clientDir) {
  app.use(express.static(clientDir));
  app.get('/{*splat}', (_req, res) => res.sendFile(join(clientDir, 'index.html')));
}

// ─── Utilidades ────────────────────────────────────────────

function newCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let tries = 0; tries < 1000; tries++) {
    const code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    if (!rooms.has(code)) return code;
  }
  throw new GameError('No se pudo crear la sala, probá de nuevo.');
}

function broadcast(room: GameRoom) {
  const ids = io.sockets.adapter.rooms.get(room.code);
  if (!ids) return;
  for (const id of ids) {
    const s = io.sockets.sockets.get(id);
    const pid = s?.data.playerId;
    if (s && pid && room.players.has(pid)) s.emit('room:state', room.viewFor(pid));
  }
}

function attach(socket: ClientSocket, room: GameRoom, playerId: string) {
  detach(socket);
  socket.data.code = room.code;
  socket.data.playerId = playerId;
  socket.join(room.code);
  room.connected(playerId, 1);
}

function detach(socket: ClientSocket) {
  const { code, playerId } = socket.data;
  if (!code || !playerId) return;
  const room = rooms.get(code);
  socket.leave(code);
  socket.data.code = undefined;
  socket.data.playerId = undefined;
  if (room) {
    room.connected(playerId, -1);
    broadcast(room);
  }
}

function createRoom(hostName: string) {
  const room = new GameRoom(newCode(), hostName);
  room.onAutoChange = () => broadcast(room);
  rooms.set(room.code, room);
  return room;
}

function closeRoom(room: GameRoom, reason: string) {
  io.to(room.code).emit('room:closed', reason);
  io.in(room.code).socketsLeave(room.code);
  room.dispose();
  rooms.delete(room.code);
}

/** Envuelve un manejador: errores → ack { ok:false }, éxito → broadcast. */
function handle<A extends unknown[]>(
  socket: ClientSocket,
  fn: (room: GameRoom, playerId: string, ...args: A) => void,
) {
  return (...args: [...A, Ack]) => {
    const ack = args[args.length - 1] as Ack;
    const reply: Ack = typeof ack === 'function' ? ack : () => {};
    const { code, playerId } = socket.data;
    const room = code ? rooms.get(code) : undefined;
    if (!room || !playerId || !room.players.has(playerId)) {
      reply({ ok: false, error: 'No estás en una sala.' });
      return;
    }
    try {
      fn(room, playerId, ...(args.slice(0, -1) as A));
      reply({ ok: true });
      broadcast(room);
    } catch (err) {
      reply({ ok: false, error: err instanceof GameError ? err.message : 'Error inesperado.' });
      if (!(err instanceof GameError)) console.error(err);
    }
  };
}

// ─── Conexiones ────────────────────────────────────────────

io.on('connection', (socket) => {
  socket.on('room:create', (p, ack) => {
    try {
      const name = sanitizeName(p?.name);
      if (!name) throw new GameError('Ingresá un nombre.');
      const room = createRoom(name);
      const host = room.players.get(room.hostId)!;
      attach(socket, room, host.id);
      const session: Session = { code: room.code, playerId: host.id, token: host.token };
      ack({ ok: true, session });
      broadcast(room);
    } catch (err) {
      ack({ ok: false, error: err instanceof GameError ? err.message : 'No se pudo crear la sala.' });
    }
  });

  socket.on('room:join', (p, ack) => {
    try {
      const code = String(p?.code ?? '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) throw new GameError('No existe una sala con ese código.');
      const player = room.addPlayer(sanitizeName(p?.name));
      attach(socket, room, player.id);
      ack({ ok: true, session: { code, playerId: player.id, token: player.token } });
      broadcast(room);
    } catch (err) {
      ack({ ok: false, error: err instanceof GameError ? err.message : 'No se pudo entrar a la sala.' });
    }
  });

  socket.on('room:resume', (p, ack) => {
    try {
      const room = rooms.get(String(p?.code ?? '').toUpperCase());
      if (!room) throw new GameError('La sala ya no existe.');
      const player = room.authenticate(String(p?.playerId), String(p?.token));
      attach(socket, room, player.id);
      ack({ ok: true });
      broadcast(room);
    } catch (err) {
      ack({ ok: false, error: err instanceof GameError ? err.message : 'No se pudo reconectar.' });
    }
  });

  socket.on('room:leave', () => {
    const { code, playerId } = socket.data;
    const room = code ? rooms.get(code) : undefined;
    if (!room || !playerId) return;
    if (playerId === room.hostId) {
      detach(socket);
      closeRoom(room, 'El juez cerró la sala.');
      return;
    }
    detach(socket);
    room.removePlayer(playerId);
    broadcast(room);
  });

  socket.on('host:settings', handle(socket, (room, pid, s) => room.updateSettings(pid, s)));
  socket.on('host:config', handle(socket, (room, pid, c) => room.updateConfig(pid, c)));
  socket.on('host:start', handle(socket, (room, pid) => room.startRound(pid)));
  socket.on('host:extend', handle(socket, (room, pid, p) => room.extendTime(pid, p?.seconds)));
  socket.on('host:endCooking', handle(socket, (room, pid) => room.endCooking(pid)));
  socket.on('host:verdict', handle(socket, (room, pid, p) => room.setVerdict(pid, String(p?.submissionId), p?.verdict)));
  socket.on('host:publish', handle(socket, (room, pid) => room.publishResults(pid)));
  socket.on('host:next', handle(socket, (room, pid) => room.nextRound(pid)));
  socket.on('host:finish', handle(socket, (room, pid) => room.finish(pid)));
  socket.on('host:newGame', handle(socket, (room, pid) => room.newGame(pid)));
  socket.on(
    'host:kick',
    handle(socket, (room, pid, p) => {
      if (pid !== room.hostId) throw new GameError('Solo el juez puede hacer eso.');
      const target = String(p?.playerId);
      room.removePlayer(target);
      for (const id of io.sockets.adapter.rooms.get(room.code) ?? []) {
        const s = io.sockets.sockets.get(id);
        if (s?.data.playerId === target) {
          s.emit('room:kicked');
          s.leave(room.code);
          s.data.code = undefined;
          s.data.playerId = undefined;
        }
      }
    }),
  );

  socket.on('player:submit', handle(socket, (room, pid, recipe) => room.submit(pid, recipe)));
  socket.on('player:unsubmit', handle(socket, (room, pid) => room.unsubmit(pid)));

  // Los borradores llegan seguido: sin ack y solo se re-emite si cambia algo visible
  socket.on('player:draft', (recipe) => {
    const { code, playerId } = socket.data;
    const room = code ? rooms.get(code) : undefined;
    if (!room || !playerId) return;
    try {
      if (room.saveDraft(playerId, recipe)) broadcast(room);
    } catch {
      /* fuera de fase: se ignora */
    }
  });

  socket.on('disconnect', () => detach(socket));
});

// ─── Limpieza de salas abandonadas ─────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const idle = now - room.lastActivity > 4 * 60 * 60 * 1000;
    const empty = room.emptySince !== null && now - room.emptySince > 30 * 60 * 1000;
    if (idle || empty) closeRoom(room, 'La sala se cerró por inactividad.');
  }
}, 60 * 1000).unref();

http.listen(PORT, '0.0.0.0', () => {
  console.log(`🍳 Servidor de Cocina Loca escuchando en http://localhost:${PORT}`);
  if (!clientDir) console.log('   (modo desarrollo: abrí el cliente en http://localhost:5173)');
});
