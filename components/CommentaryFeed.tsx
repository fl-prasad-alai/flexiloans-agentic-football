"use client";

import { useEffect, useRef } from "react";
import type { MatchEvent } from "@/lib/engine/types";

const ICON: Partial<Record<MatchEvent["kind"], string>> = {
  GOAL: "⚽",
  SAVE: "🧤",
  MISS: "📐",
  BLOCK: "🛡️",
  TACKLE: "🟨",
  INTERCEPTION: "🔀",
  KICKOFF: "🏁",
  RESTART: "🔁",
  HALF_TIME: "⏸️",
  FULL_TIME: "🏆",
  PASS_FAIL: "↩️",
  OUT_OF_BOUNDS: "🚩",
};

export function CommentaryFeed({ events }: { events: MatchEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <div
      ref={ref}
      className="rounded-2xl border h-full overflow-y-auto px-4 py-3 flex flex-col gap-2"
      style={{ background: "var(--hud-bg)", borderColor: "var(--hud-border)" }}
    >
      <div className="font-display text-lg tracking-wide sticky top-0" style={{ color: "var(--text-dim)" }}>
        Live Commentary
      </div>
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-2 text-sm animate-feed-in">
          <span className="font-mono text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
            {e.minute}&apos;
          </span>
          <span>{ICON[e.kind] ?? "•"}</span>
          <span className={e.kind === "GOAL" ? "font-semibold" : ""}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}
