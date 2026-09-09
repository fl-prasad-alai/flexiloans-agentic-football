// Core types for the Agentic Football engine.
// Pitch geometry and roles mirror agentic-football-sample-agents/AGENT_PROTOCOL.md
// (110m x 70m pitch, x:[-55,55] goal-to-goal, y:[-35,35] touchline-to-touchline).

export type Role = "GK" | "DEF" | "MID" | "FWD1" | "FWD2";

export const ROLES: Role[] = ["GK", "DEF", "MID", "FWD1", "FWD2"];

export type Side = "home" | "away";

export type Preset =
  | "balanced"
  | "aggressive"
  | "defensive"
  | "possession"
  | "counter"
  | "custom";

export interface Vec2 {
  x: number;
  y: number;
}

/** Tunable personality of one configured agent — the "brain" the user builds. */
export interface AgentPersonality {
  /** Overall intensity: press distance/aggression, tackle willingness, forward push. */
  aggression: number; // 0-1
  /** 0 = safe short passes to nearest free teammate, 1 = ambitious line-breaking through balls. */
  passDirectness: number; // 0-1
  /** Sprint tendency / willingness to cover ground and track back. */
  workRate: number; // 0-1
  /** Lowers the distance/angle bar for shooting and raises shot power. */
  shootBoldness: number; // 0-1
  /** Marking tightness / positional discipline (holds shape vs. jumps out of position). */
  discipline: number; // 0-1
}

export interface AgentConfig {
  id: string;
  role: Role;
  name: string;
  jerseyNumber: number;
  preset: Preset;
  personality: AgentPersonality;
  /** Short flavor line surfaced in the commentary feed and on the roster card. */
  motto?: string;
}

export type PitchTheme = "stadium-night" | "broadcast-day" | "minimal-turf";

export interface TeamConfig {
  id: string;
  name: string;
  shortCode: string; // 3-letter code for the scoreboard, e.g. "FLX"
  primaryColor: string;
  secondaryColor: string;
  crest: string; // emoji or short glyph shown on the kit/crest
  agents: AgentConfig[]; // exactly 5, order follows ROLES
  createdAt: number;
  updatedAt: number;
}

// --- Commands, matching AGENT_PROTOCOL.md's move repertoire ---

export type Corner = "TL" | "TR" | "BL" | "BR" | "CENTER";
export type PassType = "GROUND" | "AERIAL" | "THROUGH";
export type DistributeMethod = "THROW" | "KICK";
export type Stance = 0 | 1 | 2; // balanced | attack | defend

export type Command =
  | { type: "PASS"; targetPlayerId: string; passType: PassType }
  | { type: "SHOOT"; aim: Corner; power: number }
  | { type: "GK_DISTRIBUTE"; targetPlayerId: string; method: DistributeMethod }
  | { type: "MOVE_TO"; target: Vec2; sprint: boolean }
  | { type: "PRESS_BALL"; intensity: number }
  | { type: "INTERCEPT"; aggressive: boolean }
  | { type: "MARK"; targetPlayerId: string; tightness: "LOOSE" | "TIGHT" }
  | { type: "FOLLOW_PLAYER"; targetPlayerId: string; side: "LEFT" | "RIGHT"; distance: number }
  | { type: "SLIDE_TACKLE"; targetPlayerId: string; sprint: boolean; distance: number }
  | { type: "SET_STANCE"; stance: Stance };

export interface PlayerState {
  id: string; // `${side}-${role}`
  side: Side;
  role: Role;
  name: string;
  jerseyNumber: number;
  pos: Vec2;
  vel: Vec2;
  stamina: number; // 0-1
  hasBall: boolean;
  stance: Stance;
  lastCommand?: Command;
}

export type BallInFlight = {
  from: Vec2;
  to: Vec2;
  progress: number; // 0-1
  kind: "PASS" | "SHOT" | "CLEARANCE" | "THROW";
  ownerOnArrival?: string; // playerId who should receive it, if any
  aim?: Corner;
  /** Renderer-only metadata (doesn't affect resolution): shot power and the original pass/distribute flavor, used to shape the 3D arc. */
  power?: number;
  passType?: PassType;
  distributeMethod?: DistributeMethod;
};

export interface BallState {
  pos: Vec2;
  ownerId: string | null;
  flight: BallInFlight | null;
}

export type MatchEventKind =
  | "KICKOFF"
  | "GOAL"
  | "SAVE"
  | "MISS"
  | "BLOCK"
  | "TACKLE"
  | "INTERCEPTION"
  | "PASS_COMPLETE"
  | "PASS_FAIL"
  | "OUT_OF_BOUNDS"
  | "HALF_TIME"
  | "FULL_TIME"
  | "RESTART";

export interface MatchEvent {
  tick: number;
  minute: number;
  kind: MatchEventKind;
  side?: Side;
  playerId?: string;
  text: string;
}

export interface MatchState {
  tick: number;
  totalTicks: number;
  minute: number; // compressed game clock, 0-90
  half: 1 | 2;
  score: { home: number; away: number };
  ball: BallState;
  players: PlayerState[];
  events: MatchEvent[];
  possession: Side | null;
  finished: boolean;
  paused: boolean;
}

export interface MatchSetup {
  home: TeamConfig;
  away: TeamConfig;
  totalTicks: number;
  seed: number;
}
