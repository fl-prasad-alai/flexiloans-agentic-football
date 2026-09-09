"use client";

import type { MatchState, TeamConfig } from "@/lib/engine/types";

function TeamBadge({ team, align }: { team: TeamConfig; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div
        className="w-11 h-11 rounded-full grid place-items-center text-xl shrink-0 shadow-lg"
        style={{ background: team.primaryColor, boxShadow: "var(--glow)" }}
      >
        {team.crest}
      </div>
      <div>
        <div className="font-display text-2xl leading-none tracking-wide">{team.shortCode}</div>
        <div className="text-xs" style={{ color: "var(--text-dim)" }}>
          {team.name}
        </div>
      </div>
    </div>
  );
}

export function ScoreHUD({
  state,
  home,
  away,
  speed,
  onSpeedChange,
  onTogglePause,
  onExit,
}: {
  state: MatchState;
  home: TeamConfig;
  away: TeamConfig;
  speed: number;
  onSpeedChange: (s: number) => void;
  onTogglePause: () => void;
  onExit: () => void;
}) {
  return (
    <div
      className="rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 backdrop-blur"
      style={{ background: "var(--hud-bg)", borderColor: "var(--hud-border)" }}
    >
      <TeamBadge team={home} align="left" />

      <div className="flex flex-col items-center gap-1 min-w-[160px]">
        <div className="font-mono text-xs tracking-widest" style={{ color: "var(--text-dim)" }}>
          {state.finished ? "FULL TIME" : `HALF ${state.half}`} · {state.minute}&apos;
        </div>
        <div className="font-display text-4xl tabular-nums tracking-widest">
          {state.score.home} <span style={{ color: "var(--text-dim)" }}>–</span> {state.score.away}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className="px-2 py-0.5 rounded-md text-xs font-mono border transition"
              style={{
                borderColor: "var(--hud-border)",
                background: speed === s ? "var(--accent)" : "transparent",
                color: speed === s ? "#05070d" : "inherit",
              }}
            >
              {s}x
            </button>
          ))}
          <button
            onClick={onTogglePause}
            className="px-2 py-0.5 rounded-md text-xs font-mono border ml-1"
            style={{ borderColor: "var(--hud-border)" }}
          >
            {state.paused ? "▶" : "❚❚"}
          </button>
          <button
            onClick={onExit}
            className="px-2 py-0.5 rounded-md text-xs font-mono border ml-1"
            style={{ borderColor: "var(--hud-border)" }}
          >
            Exit
          </button>
        </div>
      </div>

      <TeamBadge team={away} align="right" />
    </div>
  );
}
