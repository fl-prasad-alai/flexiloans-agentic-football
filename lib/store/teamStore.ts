"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamConfig } from "@/lib/engine/types";

interface TeamStore {
  teams: TeamConfig[];
  activeTeamId: string | null;
  upsertTeam: (team: TeamConfig) => void;
  deleteTeam: (id: string) => void;
  setActiveTeam: (id: string | null) => void;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set) => ({
      teams: [],
      activeTeamId: null,
      upsertTeam: (team) =>
        set((s) => {
          const idx = s.teams.findIndex((t) => t.id === team.id);
          const teams = [...s.teams];
          if (idx >= 0) teams[idx] = team;
          else teams.push(team);
          return { teams, activeTeamId: team.id };
        }),
      deleteTeam: (id) =>
        set((s) => ({
          teams: s.teams.filter((t) => t.id !== id),
          activeTeamId: s.activeTeamId === id ? null : s.activeTeamId,
        })),
      setActiveTeam: (id) => set({ activeTeamId: id }),
    }),
    { name: "afc-teams" },
  ),
);
