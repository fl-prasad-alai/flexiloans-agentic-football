"use client";

import type { TeamConfig } from "@/lib/engine/types";

export function GoalFlash({ team, text }: { team: TeamConfig; text: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden animate-goal-fade">
      <div className="absolute inset-0" style={{ background: team.primaryColor, opacity: 0.16 }} />
      <div className="flex flex-col items-center gap-2 animate-goal-pop">
        <div
          className="font-display text-6xl md:text-7xl tracking-widest"
          style={{ color: team.primaryColor, textShadow: `0 0 40px ${team.primaryColor}` }}
        >
          GOAL!
        </div>
        <div
          className="rounded-full px-4 py-1.5 text-sm md:text-base font-mono backdrop-blur"
          style={{ background: "var(--hud-bg)", border: "1px solid var(--hud-border)" }}
        >
          {team.crest} {text}
        </div>
      </div>
    </div>
  );
}
