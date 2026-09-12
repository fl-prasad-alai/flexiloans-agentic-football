import type { MutableRefObject } from "react";
import type { DistributeMethod, MatchState, PassType } from "@/lib/engine/types";
import type { FlightLike } from "./arc";

/**
 * `tickMatch()` mutates its player/ball objects IN PLACE (see lib/engine/match.ts) rather than
 * replacing them each tick — `state.players` is the same array/objects for the whole match, and
 * an in-progress ball flight is the same object with `.progress` bumped in place. That's the
 * right call for the engine (no per-tick allocation), but it means holding onto the raw
 * MatchState from a previous tick is NOT a real snapshot — it silently aliases the current one,
 * so there is nothing to interpolate FROM (this previously made players render as static/stepped
 * and ball flights jump instead of animating). Every renderer instead reads a plain-number
 * snapshot taken via `toSnapshot()`, which copies values out so a "previous" snapshot stays
 * frozen even as the engine keeps mutating its own state.
 */
export interface PlayerSnapshot {
  id: string;
  x: number;
  y: number;
  hasBall: boolean;
  stamina: number;
  /** True only on the tick(s) a SLIDE_TACKLE command is issued — drives the lunge pose. */
  sliding: boolean;
  /** True when sprinting for any reason (running, pressing hard, a keeper closing down a shot). */
  sprinting: boolean;
}

export interface BallFlightSnapshot extends FlightLike {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
}

export interface BallSnapshot {
  x: number;
  y: number;
  flight: BallFlightSnapshot | null;
}

export interface FrameSnapshot {
  players: PlayerSnapshot[];
  ball: BallSnapshot;
}

export function toSnapshot(state: MatchState): FrameSnapshot {
  return {
    players: state.players.map((p) => {
      const cmd = p.lastCommand;
      const sliding = cmd?.type === "SLIDE_TACKLE";
      const sprinting =
        sliding ||
        (cmd?.type === "MOVE_TO" && cmd.sprint) ||
        (cmd?.type === "PRESS_BALL" && cmd.intensity > 0.6) ||
        (cmd?.type === "INTERCEPT" && cmd.aggressive);
      return { id: p.id, x: p.pos.x, y: p.pos.y, hasBall: p.hasBall, stamina: p.stamina, sliding, sprinting };
    }),
    ball: {
      x: state.ball.pos.x,
      y: state.ball.pos.y,
      flight: state.ball.flight
        ? {
            kind: state.ball.flight.kind,
            fromX: state.ball.flight.from.x,
            fromY: state.ball.flight.from.y,
            toX: state.ball.flight.to.x,
            toY: state.ball.flight.to.y,
            progress: state.ball.flight.progress,
            power: state.ball.flight.power,
            passType: state.ball.flight.passType as PassType | undefined,
            distributeMethod: state.ball.flight.distributeMethod as DistributeMethod | undefined,
          }
        : null,
    },
  };
}

/**
 * The engine ticks in discrete steps (every 650ms/speed), but the render loop runs at 60fps.
 * Every renderer reads through these refs and lerps from the previous snapshot to the latest
 * one based on elapsed wall-clock time, so motion reads as continuous instead of stepped.
 */
export interface RenderRefs {
  prevRef: MutableRefObject<FrameSnapshot>;
  latestRef: MutableRefObject<FrameSnapshot>;
  changedAtRef: MutableRefObject<number>;
  tickIntervalMs: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function alphaNow(refs: RenderRefs): number {
  const elapsed = performance.now() - refs.changedAtRef.current;
  return Math.min(1, Math.max(0, elapsed / Math.max(1, refs.tickIntervalMs)));
}

export interface InterpolatedPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hasBall: boolean;
  stamina: number;
  sliding: boolean;
  sprinting: boolean;
}

export function interpolatedPlayerPos(id: string, refs: RenderRefs): InterpolatedPlayer | null {
  const latest = refs.latestRef.current.players.find((p) => p.id === id);
  if (!latest) return null;
  const prev = refs.prevRef.current.players.find((p) => p.id === id) ?? latest;
  const t = alphaNow(refs);
  return {
    x: lerp(prev.x, latest.x, t),
    y: lerp(prev.y, latest.y, t),
    vx: latest.x - prev.x,
    vy: latest.y - prev.y,
    hasBall: latest.hasBall,
    stamina: latest.stamina,
    sliding: latest.sliding,
    sprinting: latest.sprinting,
  };
}

export interface InterpolatedBall {
  x: number;
  y: number;
  progress: number;
  flight: FlightLike | null;
}

export function interpolatedBall(refs: RenderRefs): InterpolatedBall {
  const latest = refs.latestRef.current.ball;
  const prev = refs.prevRef.current.ball;
  const t = alphaNow(refs);

  if (latest.flight) {
    const sameFlight =
      prev.flight &&
      prev.flight.fromX === latest.flight.fromX &&
      prev.flight.fromY === latest.flight.fromY &&
      prev.flight.toX === latest.flight.toX &&
      prev.flight.toY === latest.flight.toY;
    const prevProgress = sameFlight ? prev.flight!.progress : 0;
    const progress = lerp(Math.min(prevProgress, latest.flight.progress), latest.flight.progress, t);
    return {
      x: lerp(latest.flight.fromX, latest.flight.toX, progress),
      y: lerp(latest.flight.fromY, latest.flight.toY, progress),
      progress,
      flight: latest.flight,
    };
  }

  const fromX = prev.flight ? prev.flight.toX : prev.x;
  const fromY = prev.flight ? prev.flight.toY : prev.y;
  return {
    x: lerp(fromX, latest.x, t),
    y: lerp(fromY, latest.y, t),
    progress: 1,
    flight: null,
  };
}
