import type { BallInFlight } from "@/lib/engine/types";

const GROUND_HEIGHT = 0.32; // resting height of the ball's center (its radius)

/**
 * The 2D engine only tracks flight progress along a flat line — height is a purely
 * cosmetic arc derived here from the flight's kind/power/passType, never fed back into
 * gameplay. Shape roughly mirrors real ball flight: ground passes barely lift, aerials
 * and shots loft higher, powered shots most of all.
 */
export function flightHeight(flight: BallInFlight, progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  const rise = Math.sin(Math.PI * t);

  switch (flight.kind) {
    case "SHOT": {
      const power = flight.power ?? 0.6;
      return GROUND_HEIGHT + rise * (0.5 + power * 2.4);
    }
    case "CLEARANCE":
      return GROUND_HEIGHT + rise * 5.5;
    case "THROW":
      return GROUND_HEIGHT + rise * 1.8;
    case "PASS":
    default: {
      if (flight.distributeMethod === "KICK") return GROUND_HEIGHT + rise * 3.2;
      if (flight.passType === "AERIAL") return GROUND_HEIGHT + rise * 6.2;
      if (flight.passType === "THROUGH") return GROUND_HEIGHT + rise * 1.0;
      return GROUND_HEIGHT + rise * 0.5;
    }
  }
}

export { GROUND_HEIGHT };
