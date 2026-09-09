import type { MutableRefObject } from "react";
import type { BallInFlight, MatchState } from "@/lib/engine/types";

/**
 * The engine ticks in discrete steps (every 650ms/speed), but the render loop runs at
 * 60fps. Rather than teleporting entities between tick snapshots, every renderer reads
 * through these refs and lerps from the previous snapshot to the latest one based on
 * elapsed wall-clock time, so motion reads as continuous instead of stepped.
 */
export interface RenderRefs {
  prevRef: MutableRefObject<MatchState>;
  latestRef: MutableRefObject<MatchState>;
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
}

export function interpolatedPlayerPos(id: string, refs: RenderRefs): InterpolatedPlayer | null {
  const latest = refs.latestRef.current.players.find((p) => p.id === id);
  if (!latest) return null;
  const prev = refs.prevRef.current.players.find((p) => p.id === id) ?? latest;
  const t = alphaNow(refs);
  return {
    x: lerp(prev.pos.x, latest.pos.x, t),
    y: lerp(prev.pos.y, latest.pos.y, t),
    vx: latest.pos.x - prev.pos.x,
    vy: latest.pos.y - prev.pos.y,
    hasBall: latest.hasBall,
    stamina: latest.stamina,
  };
}

export interface InterpolatedBall {
  x: number;
  y: number;
  progress: number;
  flight: BallInFlight | null;
}

export function interpolatedBall(refs: RenderRefs): InterpolatedBall {
  const latest = refs.latestRef.current.ball;
  const prev = refs.prevRef.current.ball;
  const t = alphaNow(refs);

  if (latest.flight) {
    const prevProgress = prev.flight ? prev.flight.progress : 0;
    const progress = lerp(Math.min(prevProgress, latest.flight.progress), latest.flight.progress, t);
    return {
      x: lerp(latest.flight.from.x, latest.flight.to.x, progress),
      y: lerp(latest.flight.from.y, latest.flight.to.y, progress),
      progress,
      flight: latest.flight,
    };
  }

  const fromX = prev.flight ? prev.flight.to.x : prev.pos.x;
  const fromY = prev.flight ? prev.flight.to.y : prev.pos.y;
  return {
    x: lerp(fromX, latest.pos.x, t),
    y: lerp(fromY, latest.pos.y, t),
    progress: 1,
    flight: null,
  };
}
