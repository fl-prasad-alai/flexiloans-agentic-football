import type { AgentConfig, Command, Corner, MatchState, PlayerState, Side } from "./types";
import { attackDir, clamp, clampToPitch, defaultSlot, dist, goalXFor, oppGoalXFor, PITCH } from "./pitch";

function teammatesOf(state: MatchState, side: Side, excludeId?: string): PlayerState[] {
  return state.players.filter((p) => p.side === side && p.id !== excludeId);
}
function opponentsOf(state: MatchState, side: Side): PlayerState[] {
  const other: Side = side === "home" ? "away" : "home";
  return state.players.filter((p) => p.side === other);
}
function nearest(from: { pos: { x: number; y: number } }, pool: PlayerState[]): PlayerState | null {
  let best: PlayerState | null = null;
  let bestD = Infinity;
  for (const p of pool) {
    const d = dist(from.pos, p.pos);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
function goalDist(player: PlayerState, side: Side): number {
  // Mirrors AGENT_PROTOCOL.md's distOppGoal quirk: x-axis distance only.
  return Math.abs(oppGoalXFor(side) - player.pos.x);
}

const BASE_SHOOT_RANGE: Record<PlayerState["role"], number> = {
  GK: 0,
  DEF: 15,
  MID: 19,
  FWD1: 23,
  FWD2: 23,
};

function pickAim(player: PlayerState, side: Side, opponents: PlayerState[]): Corner {
  const gk = opponents.find((o) => o.role === "GK");
  const keeperY = gk ? gk.pos.y : 0;
  // Aim away from the keeper's current position; slight bias toward the far post.
  const goingTop = keeperY >= 0;
  const wide = Math.abs(player.pos.y) > 10;
  if (!wide) return goingTop ? "BL" : "TL";
  return goingTop ? "BR" : "TR";
}

function bestPassTarget(
  player: PlayerState,
  side: Side,
  teammates: PlayerState[],
  opponents: PlayerState[],
  directness: number,
): { target: PlayerState; type: "GROUND" | "AERIAL" | "THROUGH" } | null {
  const outfield = teammates.filter((t) => t.role !== "GK");
  if (outfield.length === 0) return null;
  const dir = attackDir(side);
  const scored = outfield.map((t) => {
    const advancement = (t.pos.x - player.pos.x) * dir;
    const marker = nearest(t, opponents);
    const openness = marker ? Math.min(dist(t.pos, marker.pos), 15) : 15;
    const passLane = dist(player.pos, t.pos);
    const laneRisk = opponents.some((o) => distToSegment(o.pos, player.pos, t.pos) < 3) ? -6 : 0;
    // Weight forward progress by directness; weight safety (openness, short lane) by (1-directness).
    const score =
      directness * (advancement * 0.6 + openness * 0.4) +
      (1 - directness) * (openness * 0.7 - passLane * 0.15) +
      laneRisk;
    return { t, score, advancement };
  });
  scored.sort((a, b) => b.score - a.score);
  const pick = scored[0];
  const type: "GROUND" | "AERIAL" | "THROUGH" =
    pick.advancement > 15 && directness > 0.55 ? "THROUGH" : passLaneIsLong(player, pick.t) ? "AERIAL" : "GROUND";
  return { target: pick.t, type };
}

function passLaneIsLong(a: PlayerState, b: PlayerState): boolean {
  return dist(a.pos, b.pos) > 30;
}

function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby || 1;
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const projx = a.x + abx * t;
  const projy = a.y + aby * t;
  return Math.hypot(p.x - projx, p.y - projy);
}

const GK_MAX_OFF_LINE = 5; // how far off the goal line a keeper will come in open play
const GK_CLAIM_RADIUS = 10; // will rush a loose ball only within this radius, and only in the box

/**
 * Goalkeepers get a dedicated brain instead of falling through the outfield priority ladder —
 * that used to let them "MARK" an opponent or chase a loose ball anywhere on the pitch, dragging
 * them out of goal, and left them standing still until a shot had nearly arrived. Real keepers
 * continuously hold the angle between the ball and the goal ("narrowing the angle"), coming
 * further off the line the more distant the danger and tucking back in as it closes, and they
 * actively track a shot once it's struck rather than reacting only on arrival.
 */
function decideGoalkeeper(player: PlayerState, config: AgentConfig, state: MatchState): Command {
  const { personality: pers } = config;
  const side = player.side;
  const goalX = goalXFor(side);
  const dir = attackDir(side); // points away from the own goal, into the pitch

  if (player.hasBall) {
    const teammates = teammatesOf(state, side, player.id);
    const opponents = opponentsOf(state, side);
    const pass = bestPassTarget(player, side, teammates, opponents, Math.max(pers.passDirectness, 0.5));
    if (!pass) return { type: "MOVE_TO", target: player.pos, sprint: false };
    const laneOpen = !opponents.some((o) => distToSegment(o.pos, player.pos, pass.target.pos) < 4);
    return {
      type: "GK_DISTRIBUTE",
      targetPlayerId: pass.target.id,
      method: laneOpen && dist(player.pos, pass.target.pos) > 15 ? "KICK" : "THROW",
    };
  }

  // React to a shot heading at this goal while it's still in flight — track toward where it's
  // going instead of standing still until it's already arrived (shots now take a few ticks to
  // resolve specifically so this reaction has time to matter).
  const flight = state.ball.flight;
  if (flight && flight.kind === "SHOT" && Math.abs(flight.to.x - goalX) < 6) {
    return { type: "MOVE_TO", target: clampToPitch({ x: flight.to.x, y: flight.to.y }), sprint: true };
  }

  // A loose ball right in the box is fair game to rush out and claim; anything further is left
  // to the outfield defenders — a keeper shouldn't sprint upfield for a 50-50 ball.
  if (!state.ball.ownerId && !state.ball.flight) {
    const d = dist(player.pos, state.ball.pos);
    if (d < GK_CLAIM_RADIUS && Math.abs(state.ball.pos.x - goalX) < PITCH.penaltyBoxX + 4) {
      return { type: "MOVE_TO", target: clampToPitch(state.ball.pos), sprint: true };
    }
  }

  // Otherwise, hold position on the angle: come off the line more when the danger is distant,
  // narrow the stance (hug the center) as it gets closer.
  const ballDistToGoal = Math.abs(goalX - state.ball.pos.x);
  const nearGoal = clamp(1 - ballDistToGoal / 45, 0, 1); // 0 = far away, 1 = right on the line
  const offLine = GK_MAX_OFF_LINE * (0.35 + nearGoal * 0.65) * (0.6 + pers.discipline * 0.5);
  const shrink = 0.35 + nearGoal * 0.35;
  const target = {
    x: clamp(goalX + dir * offLine, goalX + dir * 0.5, goalX + dir * (GK_MAX_OFF_LINE + 3)),
    y: clampToPitch({ x: 0, y: state.ball.pos.y }).y * shrink,
  };
  return { type: "MOVE_TO", target: clampToPitch(target), sprint: nearGoal > 0.5 };
}

export function decide(player: PlayerState, config: AgentConfig, state: MatchState): Command {
  if (player.role === "GK") {
    return decideGoalkeeper(player, config, state);
  }

  const { personality: pers } = config;
  const side = player.side;
  const teammates = teammatesOf(state, side, player.id);
  const opponents = opponentsOf(state, side);
  const marker = nearest(player, opponents);
  const pressure = marker ? dist(player.pos, marker.pos) : 99;

  // --- 1. In possession ---
  if (player.hasBall) {
    const dGoal = goalDist(player, side);
    const shootRange = BASE_SHOOT_RANGE[player.role] * (0.5 + pers.shootBoldness * 0.55);
    const underPressure = pressure < 6 - pers.aggression * 2.5;

    if (underPressure && dGoal > shootRange * 0.6) {
      const pass = bestPassTarget(player, side, teammates, opponents, pers.passDirectness);
      if (pass) return { type: "PASS", targetPlayerId: pass.target.id, passType: pass.type };
    }

    // Only a clean, unpressured sight of goal is taken immediately — a marker right on top of
    // them means looking for a pass instead of forcing a contested shot (tiki-taka buildup).
    if (dGoal <= shootRange && !underPressure) {
      return { type: "SHOOT", aim: pickAim(player, side, opponents), power: 0.45 + pers.shootBoldness * 0.55 };
    }

    if (pers.passDirectness < 0.4 || pressure < 4) {
      const pass = bestPassTarget(player, side, teammates, opponents, pers.passDirectness);
      if (pass) return { type: "PASS", targetPlayerId: pass.target.id, passType: pass.type };
    }

    // Dribble forward.
    const dir = attackDir(side);
    const target = clampToPitch({ x: player.pos.x + dir * (6 + pers.aggression * 6), y: player.pos.y });
    return { type: "MOVE_TO", target, sprint: pers.workRate > 0.4 };
  }

  // --- 2. Own team in possession, off the ball ---
  if (state.possession === side) {
    const slot = defaultSlot(side, player.role);
    const dir = attackDir(side);
    if (player.role === "FWD1" || player.role === "FWD2") {
      const push = 4 + pers.aggression * 10;
      const target = clampToPitch({ x: slot.x + dir * push, y: slot.y + (player.role === "FWD1" ? -4 : 4) });
      return { type: "MOVE_TO", target, sprint: pers.workRate > 0.45 };
    }
    if (player.role === "MID") {
      const target = clampToPitch({ x: slot.x + dir * (2 + pers.aggression * 6), y: slot.y });
      return { type: "MOVE_TO", target, sprint: false };
    }
    if (player.role === "DEF") {
      const push = pers.discipline > 0.6 ? 0 : 3;
      return { type: "MOVE_TO", target: clampToPitch({ x: slot.x + dir * push, y: slot.y }), sprint: false };
    }
    // Unreachable in practice (GK short-circuits at the top of decide(), and DEF/MID/FWD1/FWD2
    // are all handled above) — kept only as a defensive fallback.
    return { type: "MOVE_TO", target: slot, sprint: false };
  }

  // --- 3. Opponent in possession (defend) ---
  if (state.possession && state.possession !== side) {
    const carrier = state.players.find((p) => p.hasBall) ?? null;
    const pressDistance = 8 + pers.aggression * 14;
    if (carrier && dist(player.pos, carrier.pos) < pressDistance) {
      if (dist(player.pos, carrier.pos) < 3 && pers.aggression > 0.7) {
        return { type: "SLIDE_TACKLE", targetPlayerId: carrier.id, sprint: true, distance: dist(player.pos, carrier.pos) };
      }
      if (dist(player.pos, carrier.pos) < 5) {
        return { type: "INTERCEPT", aggressive: pers.aggression > 0.55 };
      }
      return { type: "PRESS_BALL", intensity: Math.min(1, pers.aggression + 0.1) };
    }
    if (player.role === "DEF" || player.role === "MID") {
      const danger = nearestDangerousOpponent(player, opponents, side);
      if (danger) {
        return { type: "MARK", targetPlayerId: danger.id, tightness: pers.discipline > 0.55 ? "TIGHT" : "LOOSE" };
      }
    }
    const slot = defaultSlot(side, player.role);
    return { type: "MOVE_TO", target: slot, sprint: false };
  }

  // --- 4. Loose ball ---
  const teammatesAll = teammatesOf(state, side);
  const closestOwn = nearest({ pos: state.ball.pos }, [player, ...teammatesAll]);
  if (closestOwn?.id === player.id) {
    return { type: "MOVE_TO", target: clampToPitch(state.ball.pos), sprint: pers.workRate > 0.3 };
  }
  return { type: "MOVE_TO", target: defaultSlot(side, player.role), sprint: false };
}

function nearestDangerousOpponent(player: PlayerState, opponents: PlayerState[], side: Side): PlayerState | null {
  const dir = attackDir(side);
  const attackers = opponents.filter((o) => o.role !== "GK");
  let best: PlayerState | null = null;
  let bestScore = -Infinity;
  for (const o of attackers) {
    const advancement = o.pos.x * -dir; // how far into our half, from our attacking direction
    const score = advancement - dist(player.pos, o.pos) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

export { BASE_SHOOT_RANGE };
