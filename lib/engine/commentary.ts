import type { MatchEvent, MatchEventKind, Side, TeamConfig } from "./types";

const TEMPLATES: Partial<Record<MatchEventKind, string[]>> = {
  KICKOFF: ["Kickoff — {team} get us underway.", "And we're off! {team} start with the ball."],
  GOAL: [
    "GOAL! {player} finds the net for {team}!",
    "IT'S IN! {player} makes it count for {team}!",
    "{player} buries it — {team} are ahead!",
  ],
  SAVE: ["Great stop! The {oppTeam} keeper denies {player}.", "Saved! {player}'s effort is kept out."],
  MISS: ["{player} drags it wide for {team}.", "Off target from {player} — half-chance wasted."],
  BLOCK: ["Blocked! A defender throws themselves in front of {player}'s shot."],
  TACKLE: ["{player} wins it back with a strong challenge.", "Crunching tackle from {player}!"],
  INTERCEPTION: ["{player} reads it and cuts out the pass.", "Intercepted by {player}."],
  PASS_COMPLETE: ["{player} finds a teammate.", "Neat pass from {player}."],
  PASS_FAIL: ["{player}'s pass goes astray.", "That pass from {player} doesn't find a teammate."],
  OUT_OF_BOUNDS: ["Out of play.", "Ball goes out — restart coming up."],
  HALF_TIME: ["Half-time.", "The referee brings the first half to a close."],
  FULL_TIME: ["Full time!", "That's the final whistle."],
  RESTART: ["Play resumes.", "Back underway."],
};

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length) % arr.length];
}

export function renderCommentary(
  kind: MatchEventKind,
  vars: { player?: string; team?: TeamConfig; oppTeam?: TeamConfig },
  rand: () => number,
): string {
  const pool = TEMPLATES[kind] ?? ["{player}"];
  const template = pick(pool, rand);
  return template
    .replace("{player}", vars.player ?? "")
    .replace("{team}", vars.team?.name ?? "")
    .replace("{oppTeam}", vars.oppTeam?.name ?? "");
}

export function sideLabel(side: Side, home: TeamConfig, away: TeamConfig): TeamConfig {
  return side === "home" ? home : away;
}

export function minuteOf(tick: number, totalTicks: number): number {
  return Math.min(90, Math.round((tick / totalTicks) * 90));
}

export function makeEvent(
  tick: number,
  totalTicks: number,
  kind: MatchEventKind,
  text: string,
  side?: Side,
  playerId?: string,
): MatchEvent {
  return { tick, minute: minuteOf(tick, totalTicks), kind, text, side, playerId };
}
