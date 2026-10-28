// ─────────────────────────────────────────────────────────────
// Lógica de una sala de juego (sin dependencias de red).
// ─────────────────────────────────────────────────────────────

import { randomBytes, randomUUID } from 'node:crypto';
import { randomBasket } from '../shared/ingredients';
import { DEFAULT_RULES, sanitizeRules } from '../shared/rules';
import { sanitizeBasket, sanitizeRecipe } from '../shared/sanitize';
import { analyzeRound, pointsFromVerdict, verdictFromSuggestion } from '../shared/scoring';
import type {
  Analysis,
  AwardId,
  JudgingEntry,
  Phase,
  PublicPlayer,
  Recipe,
  ResultEntry,
  RoomSettings,
  RoomView,
  RoundConfig,
  RoundSummary,
  Submission,
  Verdict,
} from '../shared/types';
import { AWARDS } from '../shared/types';

export class GameError extends Error {}

interface PlayerRec {
  id: string;
  name: string;
  token: string;
  isHost: boolean;
  score: number;
  sockets: number;
  joinedAt: number;
}

interface ActiveRound {
  number: number;
  config: RoundConfig;
  startedAt: number;
  endsAt: number | null;
  drafts: Map<string, Recipe>;
  submissions: Map<string, Submission>;
  analyses: Map<string, Analysis> | null;
  verdicts: Map<string, Verdict>;
  aliases: Map<string, string>;
  results: ResultEntry[] | null;
}

interface RoundRecord {
  number: number;
  theme: string;
  entries: ResultEntry[];
}

const aliasFor = (i: number) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return `Plato ${i < 26 ? letters[i] : letters[Math.floor(i / 26) - 1] + letters[i % 26]}`;
};

export class GameRoom {
  readonly code: string;
  readonly hostId: string;
  players = new Map<string, PlayerRec>();
  phase: Phase = 'setup';
  roundNumber = 0;
  settings: RoomSettings = { anonymousJudging: true, showHints: true, plannedRounds: 3 };
  config: RoundConfig = { basket: randomBasket(12), rules: { ...DEFAULT_RULES } };
  round: ActiveRound | null = null;
  history: RoundRecord[] = [];
  lastActivity = Date.now();
  emptySince: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Lo llama la sala cuando cambia sola (p. ej., se acaba el tiempo). */
  onAutoChange: () => void = () => {};

  constructor(code: string, hostName: string) {
    this.code = code;
    const host = this.addPlayer(hostName, true);
    this.hostId = host.id;
  }

  // ─── Jugadores ────────────────────────────────────────────

  addPlayer(name: string, isHost = false): PlayerRec {
    if (!name) throw new GameError('Ingresá un nombre.');
    const taken = [...this.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (taken) throw new GameError('Ese nombre ya está en uso en esta sala.');
    if (this.players.size >= 40) throw new GameError('La sala está llena.');
    if (this.phase === 'final') throw new GameError('La partida ya terminó. Esperá a que el juez inicie otra.');
    const p: PlayerRec = {
      id: randomUUID(),
      name,
      token: randomBytes(16).toString('hex'),
      isHost,
      score: 0,
      sockets: 0,
      joinedAt: Date.now(),
    };
    this.players.set(p.id, p);
    this.touch();
    return p;
  }

  removePlayer(playerId: string) {
    if (playerId === this.hostId) throw new GameError('El juez no puede salir de su propia sala.');
    this.players.delete(playerId);
    if (this.round) {
      this.round.drafts.delete(playerId);
      const sub = this.round.submissions.get(playerId);
      if (sub && this.phase === 'cooking') this.round.submissions.delete(playerId);
    }
    this.touch();
  }

  authenticate(playerId: string, token: string): PlayerRec {
    const p = this.players.get(playerId);
    if (!p || p.token !== token) throw new GameError('Sesión inválida.');
    return p;
  }

  connected(playerId: string, delta: 1 | -1) {
    const p = this.players.get(playerId);
    if (p) p.sockets = Math.max(0, p.sockets + delta);
    const anyone = [...this.players.values()].some((x) => x.sockets > 0);
    this.emptySince = anyone ? null : Date.now();
  }

  private requireHost(playerId: string) {
    if (playerId !== this.hostId) throw new GameError('Solo el juez puede hacer eso.');
    this.touch();
  }

  private requirePhase(...phases: Phase[]) {
    if (!phases.includes(this.phase)) throw new GameError('Eso no se puede hacer en este momento.');
  }

  private touch() {
    this.lastActivity = Date.now();
  }

  private cooks(): PlayerRec[] {
    return [...this.players.values()].filter((p) => !p.isHost).sort((a, b) => a.joinedAt - b.joinedAt);
  }

  // ─── Host: configuración ─────────────────────────────────

  updateSettings(playerId: string, s: Partial<RoomSettings>) {
    this.requireHost(playerId);
    if (typeof s.anonymousJudging === 'boolean') this.settings.anonymousJudging = s.anonymousJudging;
    if (typeof s.showHints === 'boolean') this.settings.showHints = s.showHints;
    if (s.plannedRounds !== undefined) {
      const n = Math.round(Number(s.plannedRounds));
      if (Number.isFinite(n)) this.settings.plannedRounds = Math.min(20, Math.max(1, n));
    }
  }

  updateConfig(playerId: string, input: RoundConfig) {
    this.requireHost(playerId);
    this.requirePhase('setup');
    const basket = sanitizeBasket(input?.basket);
    const rules = sanitizeRules(input?.rules ?? {}, basket);
    this.config = { basket, rules };
  }

  startRound(playerId: string, now = Date.now()) {
    this.requireHost(playerId);
    this.requirePhase('setup');
    if (this.config.basket.length < 3) throw new GameError('La canasta necesita al menos 3 ingredientes.');
    if (this.cooks().length === 0) throw new GameError('Todavía no hay cocineros en la sala.');
    const { rules } = this.config;
    if (rules.minIngredients > this.config.basket.length) {
      throw new GameError('El mínimo de ingredientes supera el tamaño de la canasta.');
    }
    this.roundNumber += 1;
    this.round = {
      number: this.roundNumber,
      config: structuredClone(this.config),
      startedAt: now,
      endsAt: rules.timeLimitSec > 0 ? now + rules.timeLimitSec * 1000 : null,
      drafts: new Map(),
      submissions: new Map(),
      analyses: null,
      verdicts: new Map(),
      aliases: new Map(),
      results: null,
    };
    this.phase = 'cooking';
    this.scheduleTimer();
  }

  extendTime(playerId: string, seconds: number) {
    this.requireHost(playerId);
    this.requirePhase('cooking');
    const r = this.round!;
    const s = Math.min(600, Math.max(5, Math.round(Number(seconds) || 0)));
    const now = Date.now();
    r.endsAt = Math.max(r.endsAt ?? now, now) + s * 1000;
    this.scheduleTimer();
  }

  private scheduleTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const r = this.round;
    if (!r || this.phase !== 'cooking' || r.endsAt === null) return;
    const ms = Math.max(0, r.endsAt - Date.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.phase === 'cooking') {
        this.closeCooking();
        this.onAutoChange();
      }
    }, ms + 250);
  }

  endCooking(playerId: string) {
    this.requireHost(playerId);
    this.requirePhase('cooking');
    this.closeCooking();
  }

  /** Cierra la cocina: entrega borradores pendientes y analiza todo. */
  private closeCooking() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const r = this.round!;
    for (const [pid, draft] of r.drafts) {
      if (r.submissions.has(pid) || !this.players.has(pid)) continue;
      if (draft.items.filter((i) => i.amount > 0).length === 0) continue;
      r.submissions.set(pid, {
        id: randomUUID(),
        playerId: pid,
        recipe: { ...draft, name: draft.name || 'Plato sin nombre' },
        submittedAt: Date.now(),
        auto: true,
      });
    }
    const subs = [...r.submissions.values()];
    // alias en orden aleatorio para que el juez no adivine por el orden de entrega
    const shuffled = [...subs].sort(() => Math.random() - 0.5);
    shuffled.forEach((s, i) => r.aliases.set(s.id, aliasFor(i)));
    r.analyses = analyzeRound(subs, r.config, this.previousRecipes());
    r.endsAt = null;
    this.phase = 'judging';
    this.touch();
  }

  private previousRecipes(): Map<string, Recipe[]> {
    const map = new Map<string, Recipe[]>();
    for (const rec of this.history) {
      for (const e of rec.entries) {
        const list = map.get(e.playerId) ?? [];
        list.push(e.recipe);
        map.set(e.playerId, list);
      }
    }
    return map;
  }

  // ─── Host: juzgar ─────────────────────────────────────────

  setVerdict(playerId: string, submissionId: string, input: Verdict) {
    this.requireHost(playerId);
    this.requirePhase('judging');
    const r = this.round!;
    const analysis = r.analyses?.get(submissionId);
    if (!analysis) throw new GameError('Ese plato no existe.');
    const n = (v: unknown, min: number, max: number, def: number) => {
      const x = Math.round(Number(v));
      return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def;
    };
    const customCount = r.config.rules.customRules.length;
    const checks = Array.isArray(input?.customRuleChecks) ? input.customRuleChecks : [];
    const verdict: Verdict = {
      coherence: n(input?.coherence, 0, 100, analysis.suggested.coherence),
      creativity: n(input?.creativity, 0, 100, analysis.suggested.creativity),
      versatility: analysis.versatility === null ? null : n(input?.versatility, 0, 100, analysis.suggested.versatility ?? 0),
      bonus: n(input?.bonus, -20, 20, 0),
      comment: typeof input?.comment === 'string' ? input.comment.trim().slice(0, 280) : '',
      award: AWARDS.some((a) => a.id === input?.award) ? (input.award as AwardId) : null,
      customRuleChecks: Array.from({ length: customCount }, (_, i) => checks[i] !== false),
    };
    r.verdicts.set(submissionId, verdict);
  }

  publishResults(playerId: string) {
    this.requireHost(playerId);
    this.requirePhase('judging');
    const r = this.round!;
    const entries: ResultEntry[] = [];
    for (const sub of r.submissions.values()) {
      const analysis = r.analyses!.get(sub.id)!;
      const verdict = r.verdicts.get(sub.id) ?? verdictFromSuggestion(analysis, r.config.rules);
      const player = this.players.get(sub.playerId);
      entries.push({
        submissionId: sub.id,
        playerId: sub.playerId,
        playerName: player?.name ?? 'Jugador que salió',
        alias: r.aliases.get(sub.id) ?? '',
        recipe: sub.recipe,
        verdict,
        analysis,
        points: pointsFromVerdict(verdict, analysis, r.config.rules),
        rank: 0,
      });
    }
    entries.sort((a, b) => b.points - a.points);
    entries.forEach((e, i) => {
      e.rank = i > 0 && entries[i - 1].points === e.points ? entries[i - 1].rank : i + 1;
      const p = this.players.get(e.playerId);
      if (p) p.score += e.points;
    });
    r.results = entries;
    this.history.push({ number: r.number, theme: r.config.rules.theme, entries });
    this.phase = 'results';
  }

  nextRound(playerId: string) {
    this.requireHost(playerId);
    this.requirePhase('results');
    // La configuración anterior queda como punto de partida, sin ingredientes obligatorios
    this.config = {
      basket: this.round!.config.basket,
      rules: { ...this.round!.config.rules, requiredIngredientIds: [] },
    };
    this.phase = 'setup';
  }

  finish(playerId: string) {
    this.requireHost(playerId);
    this.requirePhase('results', 'setup');
    this.phase = 'final';
  }

  newGame(playerId: string) {
    this.requireHost(playerId);
    this.requirePhase('final', 'setup', 'results');
    for (const p of this.players.values()) p.score = 0;
    this.history = [];
    this.round = null;
    this.roundNumber = 0;
    this.phase = 'setup';
  }

  // ─── Jugadores: cocinar ──────────────────────────────────

  private requireCook(playerId: string): ActiveRound {
    const p = this.players.get(playerId);
    if (!p || p.isHost) throw new GameError('El juez no cocina.');
    this.requirePhase('cooking');
    return this.round!;
  }

  saveDraft(playerId: string, recipe: unknown): boolean {
    const r = this.requireCook(playerId);
    if (r.submissions.has(playerId)) return false;
    const clean = sanitizeRecipe(recipe, r.config.basket);
    const prevCount = r.drafts.get(playerId)?.items.length ?? -1;
    r.drafts.set(playerId, clean);
    this.touch();
    // Solo vale la pena re-emitir si cambia lo que ve el juez
    return prevCount !== clean.items.length;
  }

  submit(playerId: string, recipe: unknown) {
    const r = this.requireCook(playerId);
    const clean = sanitizeRecipe(recipe, r.config.basket);
    if (clean.items.filter((i) => i.amount > 0).length === 0) throw new GameError('Agregá al menos un ingrediente con cantidad.');
    r.drafts.set(playerId, clean);
    r.submissions.set(playerId, {
      id: randomUUID(),
      playerId,
      recipe: clean,
      submittedAt: Date.now(),
      auto: false,
    });
    this.touch();
  }

  unsubmit(playerId: string) {
    const r = this.requireCook(playerId);
    r.submissions.delete(playerId);
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }

  // ─── Vista personalizada ─────────────────────────────────

  viewFor(playerId: string): RoomView {
    const me = this.players.get(playerId)!;
    const host = this.players.get(this.hostId)!;
    const r = this.round;
    const isHost = me.isHost;

    const players: PublicPlayer[] = this.cooks().map((p) => {
      let status: PublicPlayer['status'] = 'esperando';
      if (r && (this.phase === 'cooking' || this.phase === 'judging' || this.phase === 'results')) {
        if (r.submissions.has(p.id)) status = 'entregado';
        else status = this.phase === 'cooking' ? 'cocinando' : 'sin_entregar';
      }
      return {
        id: p.id,
        name: p.name,
        connected: p.sockets > 0,
        score: p.score,
        status,
        draftCount: r?.drafts.get(p.id)?.items.length ?? 0,
      };
    });

    let config: RoundConfig | null = null;
    if (isHost) config = this.phase === 'setup' ? this.config : (r?.config ?? this.config);
    else if (r && ['cooking', 'judging', 'results'].includes(this.phase)) config = r.config;

    let judging: JudgingEntry[] | null = null;
    if (isHost && this.phase === 'judging' && r?.analyses) {
      judging = [...r.submissions.values()]
        .map((s) => ({
          submissionId: s.id,
          alias: r.aliases.get(s.id) ?? '',
          playerName: this.settings.anonymousJudging ? null : (this.players.get(s.playerId)?.name ?? '—'),
          recipe: s.recipe,
          auto: s.auto,
          analysis: r.analyses!.get(s.id)!,
          verdict: r.verdicts.get(s.id) ?? null,
        }))
        .sort((a, b) => a.alias.localeCompare(b.alias, 'es', { numeric: true }));
    }

    const history: RoundSummary[] = this.history.map((h) => ({
      number: h.number,
      theme: h.theme,
      entries: h.entries.length,
      winner: h.entries[0] ? { name: h.entries[0].playerName, recipeName: h.entries[0].recipe.name, points: h.entries[0].points } : null,
    }));

    const inRound = r && ['cooking', 'judging', 'results'].includes(this.phase);
    return {
      code: this.code,
      phase: this.phase,
      roundNumber: this.roundNumber,
      settings: this.settings,
      serverNow: Date.now(),
      me: { id: me.id, name: me.name, isHost },
      host: { id: host.id, name: host.name, connected: host.sockets > 0 },
      players,
      config,
      endsAt: this.phase === 'cooking' ? (r?.endsAt ?? null) : null,
      myDraft: inRound && !isHost ? (r!.drafts.get(playerId) ?? null) : null,
      mySubmission: inRound && !isHost ? (r!.submissions.get(playerId) ?? null) : null,
      judging,
      results: this.phase === 'results' ? (r?.results ?? null) : null,
      history,
    };
  }
}
