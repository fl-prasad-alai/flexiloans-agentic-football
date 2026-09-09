import type { AgentPersonality, Preset, Role } from "./types";

/** Base personality per preset, before per-role nudges are applied. */
export const PRESET_BASE: Record<Exclude<Preset, "custom">, AgentPersonality> = {
  balanced: { aggression: 0.5, passDirectness: 0.5, workRate: 0.5, shootBoldness: 0.5, discipline: 0.5 },
  aggressive: { aggression: 0.85, passDirectness: 0.7, workRate: 0.8, shootBoldness: 0.75, discipline: 0.3 },
  defensive: { aggression: 0.3, passDirectness: 0.25, workRate: 0.55, shootBoldness: 0.25, discipline: 0.85 },
  possession: { aggression: 0.4, passDirectness: 0.2, workRate: 0.6, shootBoldness: 0.4, discipline: 0.6 },
  counter: { aggression: 0.6, passDirectness: 0.9, workRate: 0.75, shootBoldness: 0.65, discipline: 0.4 },
};

export const PRESET_LABELS: Record<Exclude<Preset, "custom">, { label: string; blurb: string }> = {
  balanced: { label: "Balanced", blurb: "Even mix of pressing, patience and directness." },
  aggressive: { label: "Extremely Aggressive", blurb: "Press everything, shoot early, gamble on tackles." },
  defensive: { label: "Extremely Defensive", blurb: "Hold shape, mark tight, only pass safe." },
  possession: { label: "Possession", blurb: "Short passes, patient buildup, low-risk shots." },
  counter: { label: "Counter Attack", blurb: "Sit back, then break forward fast with direct balls." },
};

export function personalityForPreset(role: Role, preset: Preset, custom?: AgentPersonality): AgentPersonality {
  if (preset === "custom" && custom) return custom;
  const base = PRESET_BASE[preset === "custom" ? "balanced" : preset];
  const merged: AgentPersonality = { ...base };
  // Predictable per-role nudges: a GK never inherits a forward's shoot-boldness, forwards lean in a little.
  if (role === "GK") {
    merged.shootBoldness = 0.02;
    merged.aggression = clamp01(base.aggression - 0.15);
  } else if (role === "FWD1" || role === "FWD2") {
    merged.shootBoldness = clamp01(base.shootBoldness + 0.1);
  }
  return merged;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export const ROLE_LABELS: Record<Role, { label: string; blurb: string }> = {
  GK: { label: "Goalkeeper", blurb: "Sweeps the box, distributes to start attacks." },
  DEF: { label: "Defender", blurb: "Marks the danger, breaks up play, first outlet pass." },
  MID: { label: "Midfielder", blurb: "Sees the whole pitch, dictates tempo and through balls." },
  FWD1: { label: "Forward (Left)", blurb: "Runs the left channel, finishes chances." },
  FWD2: { label: "Forward (Right)", blurb: "Runs the right channel, finishes chances." },
};
