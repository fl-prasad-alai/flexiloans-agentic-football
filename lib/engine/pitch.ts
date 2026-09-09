import type { Role, Side, Vec2 } from "./types";

export const PITCH = {
  xMin: -55,
  xMax: 55,
  yMin: -35,
  yMax: 35,
  goalWidth: 14, // y: -7..7
  penaltyBoxX: 16.5,
  penaltyBoxY: 20,
  centerCircleRadius: 9.15,
} as const;

export function goalXFor(side: Side): number {
  // Own goal: home defends -55, away defends +55 (mirrors AGENT_PROTOCOL.md's HOME/AWAY rule).
  return side === "home" ? -55 : 55;
}

export function oppGoalXFor(side: Side): number {
  return side === "home" ? 55 : -55;
}

export function attackDir(side: Side): 1 | -1 {
  return side === "home" ? 1 : -1;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function clampToPitch(p: Vec2): Vec2 {
  return { x: clamp(p.x, PITCH.xMin, PITCH.xMax), y: clamp(p.y, PITCH.yMin, PITCH.yMax) };
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Default "home shape" resting slot per role, mirrored for the away side.
 * Loosely mirrors the per-role zones in AGENT_PROTOCOL.md (GK/DEF/MID/FWD1/FWD2).
 */
const HOME_SLOTS: Record<Role, Vec2> = {
  GK: { x: -50, y: 0 },
  DEF: { x: -28, y: 0 },
  MID: { x: -4, y: 0 },
  FWD1: { x: 26, y: -14 },
  FWD2: { x: 26, y: 14 },
};

export function defaultSlot(side: Side, role: Role): Vec2 {
  const slot = HOME_SLOTS[role];
  return side === "home" ? { ...slot } : { x: -slot.x, y: -slot.y };
}

export function cornerTarget(aim: string, side: Side): Vec2 {
  const gx = oppGoalXFor(side);
  const sign = gx > 0 ? -1 : 1; // approach offset so the "goal-line" reads correctly on both ends
  const faceX = gx + sign * 0.3;
  switch (aim) {
    case "TL":
      return { x: faceX, y: side === "home" ? -6.2 : 6.2 };
    case "TR":
      return { x: faceX, y: side === "home" ? 6.2 : -6.2 };
    case "BL":
      return { x: faceX, y: side === "home" ? -3 : 3 };
    case "BR":
      return { x: faceX, y: side === "home" ? 3 : -3 };
    default:
      return { x: faceX, y: 0 };
  }
}
