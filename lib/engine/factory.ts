import { personalityForPreset } from "./presets";
import type { AgentConfig, Preset, Role, TeamConfig } from "./types";
import { ROLES } from "./types";

const JERSEY: Record<Role, number> = { GK: 1, DEF: 4, MID: 8, FWD1: 9, FWD2: 11 };

const NAME_POOL = [
  "Rho", "Vega", "Nyx", "Orin", "Sable", "Iris", "Kade", "Zeal", "Lior", "Quinn",
  "Nova", "Ash", "Faro", "Reya", "Tobin", "Wren", "Zeta", "Odessa", "Cyrus", "Mira",
];

function randomName(seed: number): string {
  return NAME_POOL[seed % NAME_POOL.length];
}

export function makeAgentId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `agent-${Math.random().toString(36).slice(2)}`;
}

export function createAgent(role: Role, preset: Preset = "balanced", nameSeed = 0): AgentConfig {
  return {
    id: makeAgentId(),
    role,
    name: `${randomName(nameSeed)}.${role}`,
    jerseyNumber: JERSEY[role],
    preset,
    personality: personalityForPreset(role, preset),
  };
}

export function createDefaultTeam(name = "New Squad", preset: Preset = "balanced"): TeamConfig {
  const now = Date.now();
  return {
    id: makeAgentId(),
    name,
    shortCode: name.slice(0, 3).toUpperCase().padEnd(3, "X"),
    primaryColor: "#e11d2e",
    secondaryColor: "#0b1220",
    crest: "⚽",
    agents: ROLES.map((role, i) => createAgent(role, preset, i)),
    createdAt: now,
    updatedAt: now,
  };
}

export function createHouseTeam(): TeamConfig {
  const team = createDefaultTeam("The House XI", "balanced");
  team.id = "house-xi";
  team.shortCode = "HXI";
  team.primaryColor = "#64748b";
  team.secondaryColor = "#0f172a";
  team.crest = "🏠";
  team.agents = ROLES.map((role, i) => {
    const agent = createAgent(role, "balanced", i + 10);
    agent.name = `House-${role}`;
    return agent;
  });
  return team;
}
