"use client";

import { create } from "zustand";
import type { PitchTheme, TeamConfig } from "@/lib/engine/types";

interface PendingMatch {
  home: TeamConfig;
  away: TeamConfig;
  totalTicks: number;
  theme: PitchTheme;
}

interface MatchSetupStore {
  pending: PendingMatch | null;
  setPending: (m: PendingMatch) => void;
  clearPending: () => void;
}

/** In-memory only (not persisted) — just carries the two chosen teams from the "vs" screen to /match. */
export const useMatchSetupStore = create<MatchSetupStore>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  clearPending: () => set({ pending: null }),
}));
