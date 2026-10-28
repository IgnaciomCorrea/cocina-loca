import { afterEach, describe, expect, it, vi } from 'vitest';
import { CATALOG } from '../src/shared/ingredients';
import { DEFAULT_RULES } from '../src/shared/rules';
import { MAX_COOKS } from '../src/shared/sanitize';
import { GameRoom } from '../src/server/room';
import type { Recipe } from '../src/shared/types';

const basket = CATALOG.filter((i) =>
  ['harina', 'azucar', 'huevo', 'manteca', 'leche', 'chocolate', 'aji_molido', 'sal', 'cebolla', 'tomate', 'lentejas', 'caldo'].includes(i.id),
);

const torta: Recipe = {
  name: 'Torta',
  dishTypeId: 'torta',
  technique: 'hornear',
  description: '',
  items: [
    { ingredientId: 'harina', amount: 250 },
    { ingredientId: 'azucar', amount: 200 },
    { ingredientId: 'huevo', amount: 3 },
    { ingredientId: 'manteca', amount: 100 },
  ],
};
const guiso: Recipe = {
  name: 'Guiso',
  dishTypeId: 'guiso',
  technique: 'hervir',
  description: '',
  items: [
    { ingredientId: 'lentejas', amount: 300 },
    { ingredientId: 'cebolla', amount: 150 },
    { ingredientId: 'caldo', amount: 400 },
    { ingredientId: 'sal', amount: 6 },
  ],
};

function setup() {
  const room = new GameRoom('TEST', 'Juez');
  const ana = room.addPlayer('Ana');
  const beto = room.addPlayer('Beto');
  room.updateConfig(room.hostId, { basket, rules: { ...DEFAULT_RULES, timeLimitSec: 60 } });
  return { room, ana, beto };
}

afterEach(() => vi.useRealTimers());

describe('GameRoom', () => {
  it('admite hasta 8 cocineros sin contar al juez', () => {
    const { room } = setup();
    for (let i = room.players.size - 1; i < MAX_COOKS; i++) room.addPlayer(`Cocinero ${i}`);
    expect([...room.players.values()].filter((p) => !p.isHost)).toHaveLength(8);
    expect(() => room.addPlayer('Uno más')).toThrow(/llena/);
  });

  it('no permite nombres repetidos', () => {
    const { room } = setup();
    expect(() => room.addPlayer('ana')).toThrow(/en uso/);
  });

  it('solo el host configura y arranca', () => {
    const { room, ana } = setup();
    expect(() => room.startRound(ana.id)).toThrow(/juez/);
    room.startRound(room.hostId);
    expect(room.phase).toBe('cooking');
  });

  it('los jugadores no ven la canasta antes de empezar', () => {
    const { room, ana } = setup();
    expect(room.viewFor(ana.id).config).toBeNull();
    expect(room.viewFor(room.hostId).config?.basket.length).toBe(basket.length);
    room.startRound(room.hostId);
    expect(room.viewFor(ana.id).config?.basket.length).toBe(basket.length);
  });

  it('partida completa: cocinar, juzgar, publicar, siguiente ronda', () => {
    const { room, ana, beto } = setup();
    room.startRound(room.hostId);
    room.submit(ana.id, torta);
    room.saveDraft(beto.id, guiso); // Beto no entrega: se entrega solo al cerrar
    room.endCooking(room.hostId);
    expect(room.phase).toBe('judging');

    const hostView = room.viewFor(room.hostId);
    expect(hostView.judging).toHaveLength(2);
    expect(hostView.judging!.every((e) => e.playerName === null)).toBe(true); // anónimo
    expect(hostView.judging!.some((e) => e.auto)).toBe(true);
    expect(room.viewFor(ana.id).judging).toBeNull(); // los jugadores no ven el análisis

    const entry = hostView.judging![0];
    room.setVerdict(room.hostId, entry.submissionId, {
      coherence: 90,
      creativity: 80,
      versatility: null,
      bonus: 5,
      comment: '¡Muy rico!',
      award: 'plato_del_dia',
    });
    room.publishResults(room.hostId);
    expect(room.phase).toBe('results');
    const results = room.viewFor(ana.id).results!;
    expect(results).toHaveLength(2);
    expect(results[0].rank).toBe(1);
    expect(room.players.get(ana.id)!.score + room.players.get(beto.id)!.score).toBe(results[0].points + results[1].points);

    room.nextRound(room.hostId);
    expect(room.phase).toBe('setup');
    room.startRound(room.hostId);
    room.submit(ana.id, guiso);
    room.submit(beto.id, torta);
    room.endCooking(room.hostId);
    // en la segunda ronda hay versatilidad
    expect(room.viewFor(room.hostId).judging!.every((e) => e.analysis.versatility !== null)).toBe(true);
    room.publishResults(room.hostId);
    room.finish(room.hostId);
    expect(room.phase).toBe('final');
    expect(room.viewFor(ana.id).history).toHaveLength(2);
  });

  it('se cierra sola cuando se acaba el tiempo', () => {
    vi.useFakeTimers();
    const { room, ana } = setup();
    const onAuto = vi.fn();
    room.onAutoChange = onAuto;
    room.startRound(room.hostId);
    room.saveDraft(ana.id, torta);
    vi.advanceTimersByTime(61_000);
    expect(room.phase).toBe('judging');
    expect(onAuto).toHaveBeenCalled();
  });

  it('descarta ingredientes fuera de la canasta', () => {
    const { room, ana } = setup();
    room.startRound(room.hostId);
    room.submit(ana.id, { ...torta, items: [...torta.items, { ingredientId: 'langostinos', amount: 100 }] });
    const sub = room.viewFor(ana.id).mySubmission!;
    expect(sub.recipe.items.some((i) => i.ingredientId === 'langostinos')).toBe(false);
  });
});
