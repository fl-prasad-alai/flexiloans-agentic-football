"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CommentaryFeed } from "@/components/CommentaryFeed";
import { GoalFlash } from "@/components/GoalFlash";
import { ScoreHUD } from "@/components/ScoreHUD";
import { initMatch, tickMatch, type MatchRuntime } from "@/lib/engine/match";
import type { MatchEvent, MatchState, TeamConfig } from "@/lib/engine/types";
import { useMatchSetupStore } from "@/lib/store/matchSetupStore";

// Three.js needs a real DOM/WebGL context, so the 3D pitch is loaded client-only.
const Pitch3D = dynamic(() => import("@/components/three/Pitch3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full grid place-items-center text-sm" style={{ color: "var(--text-dim)" }}>
      Loading pitch…
    </div>
  ),
});

const BASE_INTERVAL_MS = 650;

function freshRuntime(pending: { home: TeamConfig; away: TeamConfig; totalTicks: number }) {
  return initMatch({
    home: pending.home,
    away: pending.away,
    totalTicks: pending.totalTicks,
    seed: Date.now() % 2147483647,
  });
}

export default function MatchPage() {
  const router = useRouter();
  const pending = useMatchSetupStore((s) => s.pending);
  // The simulation engine is a mutable, external-to-React object by design (see lib/engine/match.ts);
  // it lives in a ref, and only the plain-object snapshot in `matchState` drives rendering.
  const runtimeRef = useRef<MatchRuntime | null>(null);
  if (runtimeRef.current === null && pending) {
    runtimeRef.current = freshRuntime(pending);
  }
  const [matchState, setMatchState] = useState<MatchState | null>(() =>
    runtimeRef.current ? { ...runtimeRef.current.state } : null,
  );
  const [speed, setSpeed] = useState(1);
  const [goalFlash, setGoalFlash] = useState<{ key: number; side: "home" | "away"; text: string } | null>(null);
  const goalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while play is held for a goal celebration specifically (as opposed to the user's own
  // pause button) — lets the auto-resume below back off if the user pauses during the flash.
  const goalHoldRef = useRef(false);
  const [tickEvents, setTickEvents] = useState<MatchEvent[]>([]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === contentRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      contentRef.current?.requestFullscreen().catch(() => {});
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      const rt = runtimeRef.current;
      if (!rt || rt.state.finished || rt.state.paused) return;
      const events = tickMatch(rt);
      const goal = events.find((e) => e.kind === "GOAL");
      if (goal && goal.side) {
        rt.state.paused = true;
        goalHoldRef.current = true;
        if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
        setGoalFlash({ key: goal.tick, side: goal.side, text: goal.text });
        goalTimeoutRef.current = setTimeout(() => {
          setGoalFlash(null);
          if (goalHoldRef.current && runtimeRef.current) {
            goalHoldRef.current = false;
            runtimeRef.current.state.paused = false;
            setMatchState({ ...runtimeRef.current.state });
          }
        }, 2400);
      }
      setMatchState({ ...rt.state });
      setTickEvents(events);
    }, BASE_INTERVAL_MS / speed);
    return () => clearInterval(id);
  }, [speed]);

  useEffect(() => {
    return () => {
      if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
    };
  }, []);

  function togglePause() {
    const rt = runtimeRef.current;
    if (!rt) return;
    goalHoldRef.current = false; // a manual toggle always takes priority over the goal auto-pause
    rt.state.paused = !rt.state.paused;
    setMatchState({ ...rt.state });
  }

  function rematch() {
    if (!pending) return;
    if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
    goalHoldRef.current = false;
    setGoalFlash(null);
    const fresh = freshRuntime(pending);
    runtimeRef.current = fresh;
    setMatchState({ ...fresh.state });
  }

  if (!pending) {
    return (
      <div className="flex-1 grid place-items-center px-6">
        <div className="text-center">
          <h1 className="font-display text-3xl mb-3">No match queued</h1>
          <button onClick={() => router.push("/play")} className="rounded-xl bg-white text-black px-5 py-2.5 font-semibold">
            Set up a match
          </button>
        </div>
      </div>
    );
  }

  if (!matchState) return null;

  const { home, away } = pending;

  return (
    <div data-theme={pending.theme} className="flex-1 flex flex-col" style={{ background: "var(--stadium-bg-a)" }}>
      <div
        ref={contentRef}
        data-theme={pending.theme}
        className="flex-1 flex flex-col gap-4 max-w-7xl mx-auto w-full px-4 py-6"
        style={{
          background: `radial-gradient(circle at 50% -10%, var(--stadium-bg-b), var(--stadium-bg-a))`,
        }}
      >
        <ScoreHUD
          state={matchState}
          home={home}
          away={away}
          speed={speed}
          onSpeedChange={setSpeed}
          onTogglePause={togglePause}
          onExit={() => router.push("/play")}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 min-h-[520px]">
          <div
            className="relative rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--hud-border)", background: "var(--crowd)" }}
          >
            <Pitch3D
              matchState={matchState}
              newEvents={tickEvents}
              home={home}
              away={away}
              theme={pending.theme}
              tickIntervalMs={BASE_INTERVAL_MS / speed}
            />
            {goalFlash && <GoalFlash key={goalFlash.key} team={goalFlash.side === "home" ? home : away} text={goalFlash.text} />}
          </div>
          <CommentaryFeed events={matchState.events} />
        </div>

        {matchState.finished && (
          <div
            className="rounded-2xl border p-6 flex items-center justify-between"
            style={{ background: "var(--hud-bg)", borderColor: "var(--hud-border)" }}
          >
            <div>
              <div className="font-display text-2xl">Full Time</div>
              <div className="text-sm" style={{ color: "var(--text-dim)" }}>
                {home.name} {matchState.score.home} – {matchState.score.away} {away.name}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={rematch} className="rounded-xl bg-white text-black px-4 py-2 font-semibold text-sm">
                Rematch
              </button>
              <button
                onClick={() => router.push("/play")}
                className="rounded-xl border px-4 py-2 text-sm"
                style={{ borderColor: "var(--hud-border)" }}
              >
                New Match
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
