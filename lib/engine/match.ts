import { decide } from "./decide";
import { makeEvent, minuteOf, renderCommentary } from "./commentary";
import {
  attackDir,
  clampToPitch,
  cornerTarget,
  defaultSlot,
  dist,
  goalXFor,
  oppGoalXFor,
  PITCH,
} from "./pitch";
import type { Rng } from "./rng";
import { makeRng } from "./rng";
import {
  AgentConfig,
  BallInFlight,
  Command,
  MatchEvent,
  MatchSetup,
  MatchState,
  PlayerState,
  ROLES,
  Role,
  Side,
  TeamConfig,
  Vec2,
} from "./types";

const BASE_SPEED = 5.2; // max units a player can cover in one tick
const PICKUP_RADIUS = 2.1;
const TACKLE_RADIUS = 2.4;
const MAX_EVENTS = 200;

export interface MatchRuntime {
  state: MatchState;
  homeConfig: TeamConfig;
  awayConfig: TeamConfig;
  rng: Rng;
}

export function initMatch(setup: MatchSetup): MatchRuntime {
  const { home, away, totalTicks, seed } = setup;
  const rng = makeRng(seed);
  const players: PlayerState[] = [];
  for (const side of ["home", "away"] as Side[]) {
    const cfg = side === "home" ? home : away;
    for (const role of ROLES) {
      const agent = cfg.agents.find((a) => a.role === role)!;
      players.push({
        id: `${side}-${role}`,
        side,
        role,
        name: agent.name,
        jerseyNumber: agent.jerseyNumber,
        pos: defaultSlot(side, role),
        vel: { x: 0, y: 0 },
        stamina: 1,
        hasBall: false,
        stance: 0,
      });
    }
  }

  const state: MatchState = {
    tick: 0,
    totalTicks,
    minute: 0,
    half: 1,
    score: { home: 0, away: 0 },
    ball: { pos: { x: 0, y: 0 }, ownerId: null, flight: null },
    players,
    events: [],
    possession: null,
    pendingKickoff: null,
    finished: false,
    paused: false,
  };

  kickoff(state, "home", totalTicks, home, away, rng, true);
  return { state, homeConfig: home, awayConfig: away, rng };
}

function kickoff(
  state: MatchState,
  side: Side,
  totalTicks: number,
  home: TeamConfig,
  away: TeamConfig,
  rng: Rng,
  isMatchStart: boolean,
) {
  for (const p of state.players) {
    p.pos = defaultSlot(p.side, p.role);
    p.hasBall = false;
    p.vel = { x: 0, y: 0 };
  }
  const taker = state.players.find((p) => p.side === side && p.role === "MID")!;
  taker.pos = { x: 0, y: 0 };
  taker.hasBall = true;
  state.ball = { pos: { x: 0, y: 0 }, ownerId: taker.id, flight: null };
  state.possession = side;
  const team = side === "home" ? home : away;
  const text = renderCommentary("KICKOFF", { team }, rng);
  state.events.push(makeEvent(state.tick, totalTicks, isMatchStart ? "KICKOFF" : "RESTART", text, side));
}

function configFor(playerId: string, home: TeamConfig, away: TeamConfig): { config: AgentConfig; team: TeamConfig } {
  const [side, role] = playerId.split("-") as [Side, Role];
  const team = side === "home" ? home : away;
  return { config: team.agents.find((a) => a.role === role)!, team };
}

function moveToward(pos: Vec2, target: Vec2, maxStep: number): Vec2 {
  const d = dist(pos, target);
  if (d <= maxStep || d === 0) return clampToPitch(target);
  const t = maxStep / d;
  return clampToPitch({ x: pos.x + (target.x - pos.x) * t, y: pos.y + (target.y - pos.y) * t });
}

function movementTargetFor(player: PlayerState, cmd: Command, state: MatchState): { target: Vec2; sprint: boolean } {
  switch (cmd.type) {
    case "MOVE_TO":
      return { target: cmd.target, sprint: cmd.sprint };
    case "PRESS_BALL":
      return { target: state.ball.pos, sprint: cmd.intensity > 0.5 };
    case "INTERCEPT":
      return { target: state.ball.pos, sprint: cmd.aggressive };
    case "SLIDE_TACKLE": {
      const t = state.players.find((p) => p.id === cmd.targetPlayerId);
      return { target: t ? t.pos : player.pos, sprint: true };
    }
    case "MARK": {
      const t = state.players.find((p) => p.id === cmd.targetPlayerId);
      if (!t) return { target: player.pos, sprint: false };
      const dir = attackDir(player.side);
      const offset = cmd.tightness === "TIGHT" ? 1.2 : 3;
      return { target: clampToPitch({ x: t.pos.x - dir * offset, y: t.pos.y }), sprint: false };
    }
    case "FOLLOW_PLAYER": {
      const t = state.players.find((p) => p.id === cmd.targetPlayerId);
      if (!t) return { target: player.pos, sprint: false };
      const off = cmd.side === "LEFT" ? -cmd.distance : cmd.distance;
      return { target: clampToPitch({ x: t.pos.x, y: t.pos.y + off }), sprint: false };
    }
    default:
      return { target: player.pos, sprint: false };
  }
}

function flightProgressStep(kind: BallInFlight["kind"], passType?: string, method?: string): number {
  if (kind === "SHOT") return 0.32; // spread over ~3 ticks so the ball is visibly seen approaching goal
  if (kind === "CLEARANCE") return 0.55;
  if (passType === "THROUGH") return 0.6;
  if (passType === "AERIAL") return 0.45;
  if (method === "THROW") return 0.8;
  if (method === "KICK") return 0.5;
  return 0.55;
}

export function tickMatch(runtime: MatchRuntime): MatchEvent[] {
  const { homeConfig: home, awayConfig: away, rng } = runtime;
  const state = runtime.state;
  if (state.finished || state.paused) return [];

  const newEvents: MatchEvent[] = [];
  const emit = (e: MatchEvent) => {
    newEvents.push(e);
    state.events.push(e);
    if (state.events.length > MAX_EVENTS) state.events.shift();
  };
  state.tick += 1;
  state.minute = minuteOf(state.tick, state.totalTicks);

  // --- Consume a deferred kickoff (set by resolveShot on a GOAL) ---
  // Held back a tick so the ball is seen resting in the net during the goal celebration instead
  // of teleporting straight to the center circle the instant it crosses the line.
  if (state.pendingKickoff) {
    const { side } = state.pendingKickoff;
    state.pendingKickoff = null;
    kickoff(state, side, state.totalTicks, home, away, rng, false);
  }

  // --- Advance any ball currently in flight ---
  if (state.ball.flight) {
    const f = state.ball.flight;
    f.progress = Math.min(1, f.progress + flightProgressStep(f.kind));
    state.ball.pos = { x: f.from.x + (f.to.x - f.from.x) * f.progress, y: f.from.y + (f.to.y - f.from.y) * f.progress };
    if (f.progress >= 1) {
      resolveArrival(state, f, home, away, rng, emit);
    }
  }

  // --- Decide + move every player ---
  const commands = new Map<string, Command>();
  for (const player of state.players) {
    const { config } = configFor(player.id, home, away);
    const cmd = decide(player, config, state);
    player.lastCommand = cmd;
    commands.set(player.id, cmd);
  }

  const ballOwner = state.ball.ownerId ? state.players.find((p) => p.id === state.ball.ownerId) ?? null : null;

  for (const player of state.players) {
    const cmd = commands.get(player.id)!;
    const { config } = configFor(player.id, home, away);
    const isBallAction = player.id === ballOwner?.id && (cmd.type === "PASS" || cmd.type === "SHOOT" || cmd.type === "GK_DISTRIBUTE");
    const sprinting =
      (cmd.type === "MOVE_TO" && cmd.sprint) ||
      cmd.type === "SLIDE_TACKLE" ||
      (cmd.type === "PRESS_BALL" && cmd.intensity > 0.6);

    if (!isBallAction) {
      const { target, sprint } = movementTargetFor(player, cmd, state);
      const speedFactor = 0.6 + 0.4 * player.stamina;
      const maxStep = BASE_SPEED * (sprint ? 1.45 : 1) * speedFactor;
      const before = player.pos;
      player.pos = moveToward(player.pos, target, maxStep);
      player.vel = { x: player.pos.x - before.x, y: player.pos.y - before.y };
    }

    player.stamina = clamp01(player.stamina + (sprinting ? -0.028 : 0.014) * (0.7 + config.personality.workRate * 0.6));

    if (player.hasBall && !isBallAction) {
      // Dribbling: the ball stays glued to the carrier's feet as they move.
      state.ball.pos = player.pos;
    }
  }

  // --- Resolve the ball owner's chosen action (pass / shot / distribution) ---
  if (ballOwner) {
    const cmd = commands.get(ballOwner.id)!;
    const { team } = configFor(ballOwner.id, home, away);
    if (cmd.type === "SHOOT") {
      const aimPoint = cornerTarget(cmd.aim, ballOwner.side);
      ballOwner.hasBall = false;
      state.ball.ownerId = null;
      state.ball.flight = { from: ballOwner.pos, to: aimPoint, progress: 0, kind: "SHOT", aim: cmd.aim, power: cmd.power };
    } else if (cmd.type === "PASS" || cmd.type === "GK_DISTRIBUTE") {
      const targetId = cmd.type === "PASS" ? cmd.targetPlayerId : cmd.targetPlayerId;
      const targetPlayer = state.players.find((p) => p.id === targetId);
      if (targetPlayer) {
        ballOwner.hasBall = false;
        state.ball.ownerId = null;
        const kind = cmd.type === "GK_DISTRIBUTE" ? (cmd.method === "KICK" ? "PASS" : "THROW") : "PASS";
        state.ball.flight = {
          from: ballOwner.pos,
          to: targetPlayer.pos,
          progress: 0,
          kind,
          ownerOnArrival: targetPlayer.id,
          passType: cmd.type === "PASS" ? cmd.passType : undefined,
          distributeMethod: cmd.type === "GK_DISTRIBUTE" ? cmd.method : undefined,
        };
      }
    }
    void team;
  }

  // --- Loose-ball pickup check ---
  if (!state.ball.ownerId && !state.ball.flight && !state.pendingKickoff) {
    let closest: PlayerState | null = null;
    let closestD = Infinity;
    for (const p of state.players) {
      const d = dist(p.pos, state.ball.pos);
      if (d < closestD) {
        closestD = d;
        closest = p;
      }
    }
    if (closest && closestD < PICKUP_RADIUS) {
      closest.hasBall = true;
      state.ball.ownerId = closest.id;
      state.possession = closest.side;
    }
  }

  // --- Tackle attempts against a dribbling ball carrier ---
  if (state.ball.ownerId) {
    const carrier = state.players.find((p) => p.id === state.ball.ownerId)!;
    for (const player of state.players) {
      if (player.side === carrier.side) continue;
      const cmd = commands.get(player.id)!;
      if (cmd.type !== "SLIDE_TACKLE" && cmd.type !== "PRESS_BALL" && cmd.type !== "INTERCEPT") continue;
      const d = dist(player.pos, carrier.pos);
      if (d > TACKLE_RADIUS) continue;
      const { config } = configFor(player.id, home, away);
      let chance = 0.2;
      if (cmd.type === "SLIDE_TACKLE") chance = clamp01(0.55 - d * 0.08 + config.personality.aggression * 0.25);
      if (cmd.type === "INTERCEPT") chance = clamp01(0.3 + config.personality.aggression * 0.2);
      if (cmd.type === "PRESS_BALL") chance = clamp01(0.18 + config.personality.aggression * 0.15);
      if (rng() < chance) {
        // A won challenge spills the ball loose between the two players rather than snapping
        // possession straight to the tackler — a real 50-50 duel ends in a scramble, not an
        // instant swap. Whoever gets there first on a following tick (either side) picks it up
        // via the ordinary loose-ball check.
        carrier.hasBall = false;
        state.ball.ownerId = null;
        state.possession = null;
        const midX = (carrier.pos.x + player.pos.x) / 2 + (rng() - 0.5) * 2;
        const midY = (carrier.pos.y + player.pos.y) / 2 + (rng() - 0.5) * 2;
        state.ball.pos = clampToPitch({ x: midX, y: midY });
        emit(makeEvent(state.tick, state.totalTicks, "TACKLE", renderCommentary("TACKLE", { player: player.name }, rng), player.side, player.id));
        break;
      }
    }
  }

  // --- Half-time / full-time ---
  if (state.half === 1 && state.minute >= 45) {
    state.half = 2;
    emit(makeEvent(state.tick, state.totalTicks, "HALF_TIME", renderCommentary("HALF_TIME", {}, rng)));
    kickoff(state, "away", state.totalTicks, home, away, rng, false);
  }
  if (state.tick >= state.totalTicks) {
    state.finished = true;
    emit(makeEvent(state.tick, state.totalTicks, "FULL_TIME", renderCommentary("FULL_TIME", {}, rng)));
  }

  return newEvents;
}

function resolveArrival(
  state: MatchState,
  flight: BallInFlight,
  home: TeamConfig,
  away: TeamConfig,
  rng: Rng,
  emit: (e: MatchEvent) => void,
) {
  state.ball.flight = null;

  if (flight.kind === "SHOT") {
    resolveShot(state, flight, home, away, rng, emit);
    return;
  }

  // PASS / THROW / CLEARANCE arrival.
  const intendedId = flight.ownerOnArrival;
  const intended = intendedId ? state.players.find((p) => p.id === intendedId) : null;
  const passingSide = intended?.side;
  const opponents = state.players.filter((p) => p.side !== passingSide);
  let interceptor: PlayerState | null = null;
  let bestD = Infinity;
  for (const o of opponents) {
    const d = dist(o.pos, state.ball.pos);
    if (d < bestD) {
      bestD = d;
      interceptor = o;
    }
  }

  if (interceptor && bestD < 3.2) {
    interceptor.hasBall = true;
    state.ball.ownerId = interceptor.id;
    state.possession = interceptor.side;
    emit(makeEvent(state.tick, state.totalTicks, "INTERCEPTION", renderCommentary("INTERCEPTION", { player: interceptor.name }, rng), interceptor.side, interceptor.id));
    return;
  }

  if (intended && dist(intended.pos, state.ball.pos) < PICKUP_RADIUS + 1.5) {
    intended.hasBall = true;
    state.ball.ownerId = intended.id;
    state.possession = intended.side;
    return;
  }

  // Nobody close enough — loose ball, up for grabs.
  state.ball.ownerId = null;
  state.possession = null;
  const { team } = intendedId ? configFor(intendedId, home, away) : { team: undefined };
  void team;
  emit(makeEvent(state.tick, state.totalTicks, "PASS_FAIL", renderCommentary("PASS_FAIL", { player: intended?.name }, rng)));
}

function resolveShot(
  state: MatchState,
  flight: BallInFlight,
  home: TeamConfig,
  away: TeamConfig,
  rng: Rng,
  emit: (e: MatchEvent) => void,
) {
  const shooterSide: Side = flight.from.x < flight.to.x ? "home" : "away";
  const shooter = state.players.reduce<PlayerState | null>((best, p) => {
    if (p.side !== shooterSide) return best;
    const d = dist(p.pos, flight.from);
    if (!best || d < dist(best.pos, flight.from)) return p;
    return best;
  }, null);
  const power = (flight as BallInFlight & { power?: number }).power ?? 0.6;
  const defendingSide: Side = shooterSide === "home" ? "away" : "home";
  const keeper = state.players.find((p) => p.side === defendingSide && p.role === "GK")!;

  const onTargetChance = clamp01(0.28 + power * 0.1);
  const onTarget = rng() < onTargetChance;

  if (!onTarget) {
    keeper.hasBall = true;
    keeper.pos = defaultSlot(defendingSide, "GK");
    state.ball.ownerId = keeper.id;
    state.ball.pos = keeper.pos;
    state.possession = defendingSide;
    emit(
      makeEvent(
        state.tick,
        state.totalTicks,
        "MISS",
        renderCommentary("MISS", { player: shooter?.name, team: shooterSide === "home" ? home : away }, rng),
        shooterSide,
        shooter?.id,
      ),
    );
    return;
  }

  const keeperDist = dist(keeper.pos, flight.to);
  // The keeper now actively tracks an incoming shot (see decideGoalkeeper in decide.ts), so
  // keeperDist alone under-punishes a well-struck shot — power matters much more here than it
  // used to, since a well-positioned keeper can still be beaten by pace/placement.
  const saveChance = clamp01(0.72 - keeperDist * 0.02 - power * 0.2);
  const saved = rng() < saveChance;

  if (saved) {
    keeper.hasBall = true;
    keeper.pos = flight.to;
    state.ball.ownerId = keeper.id;
    state.ball.pos = keeper.pos;
    state.possession = defendingSide;
    emit(makeEvent(state.tick, state.totalTicks, "SAVE", renderCommentary("SAVE", { player: shooter?.name }, rng), shooterSide, shooter?.id));
    return;
  }

  // GOAL. Leave the ball resting at the net (no owner, no flight) and defer the actual kickoff
  // reset a tick — see the pendingKickoff consumption at the top of tickMatch().
  state.score[shooterSide] += 1;
  const team = shooterSide === "home" ? home : away;
  state.possession = null;
  state.pendingKickoff = { side: defendingSide };
  emit(makeEvent(state.tick, state.totalTicks, "GOAL", renderCommentary("GOAL", { player: shooter?.name, team }, rng), shooterSide, shooter?.id));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export { goalXFor, oppGoalXFor, PITCH };
