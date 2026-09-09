"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { AgentEditor } from "@/components/AgentEditor";
import { createDefaultTeam } from "@/lib/engine/factory";
import { ROLES } from "@/lib/engine/types";
import { useTeamStore } from "@/lib/store/teamStore";

const CRESTS = ["⚽", "🦁", "🐺", "🦅", "🔥", "⚡", "🛡️", "🐍", "🐯", "🌊"];

export default function BuildPage() {
  const teams = useTeamStore((s) => s.teams);
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const upsertTeam = useTeamStore((s) => s.upsertTeam);
  const deleteTeam = useTeamStore((s) => s.deleteTeam);
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [teams, activeTeamId]);

  useEffect(() => {
    if (!activeTeamId && teams.length > 0) setActiveTeam(teams[0].id);
  }, [activeTeamId, teams, setActiveTeam]);

  function newSquad() {
    const team = createDefaultTeam(`Squad ${teams.length + 1}`);
    upsertTeam(team);
  }

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 max-w-7xl mx-auto w-full px-6 py-10">
      <aside className="flex flex-col gap-4">
        <Link href="/" className="text-xs text-white/40 hover:text-white/70">
          ← Back home
        </Link>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-wide">Your Squads</h2>
        </div>
        <button
          onClick={newSquad}
          className="rounded-xl border border-dashed border-white/25 py-2.5 text-sm text-white/70 hover:border-white/50 hover:text-white transition"
        >
          + New Squad
        </button>
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveTeam(t.id)}
                className={`flex-1 text-left px-3 py-2 rounded-xl border text-sm flex items-center gap-2 transition ${
                  t.id === activeTeamId
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full grid place-items-center text-xs shrink-0"
                  style={{ background: t.primaryColor }}
                >
                  {t.crest}
                </span>
                <span className="truncate">{t.name}</span>
              </button>
              <button
                onClick={() => deleteTeam(t.id)}
                className="text-white/25 hover:text-red-400 text-xs px-2"
                title="Delete squad"
              >
                ✕
              </button>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-xs text-white/30">No squads yet — create your first one above.</p>
          )}
        </div>

        {activeTeam && (
          <Link
            href="/play"
            className="mt-4 text-center rounded-xl bg-white text-black font-semibold py-2.5 text-sm hover:bg-white/90 transition"
          >
            Ready to play →
          </Link>
        )}
      </aside>

      <main className="flex flex-col gap-6">
        {!activeTeam ? (
          <div className="rounded-2xl border border-white/10 p-10 text-center text-white/50">
            Create a squad to start configuring your five agents.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-wrap items-center gap-4">
              <input
                value={activeTeam.name}
                onChange={(e) => upsertTeam({ ...activeTeam, name: e.target.value, updatedAt: Date.now() })}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-lg font-display tracking-wide outline-none focus:border-white/40 flex-1 min-w-[160px]"
              />
              <input
                value={activeTeam.shortCode}
                maxLength={3}
                onChange={(e) =>
                  upsertTeam({ ...activeTeam, shortCode: e.target.value.toUpperCase(), updatedAt: Date.now() })
                }
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 w-20 text-center font-mono outline-none focus:border-white/40"
              />
              <div className="flex gap-1">
                {CRESTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => upsertTeam({ ...activeTeam, crest: c, updatedAt: Date.now() })}
                    className={`w-8 h-8 rounded-full grid place-items-center border ${
                      activeTeam.crest === c ? "border-white" : "border-white/10"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-white/50">
                Kit
                <input
                  type="color"
                  value={activeTeam.primaryColor}
                  onChange={(e) => upsertTeam({ ...activeTeam, primaryColor: e.target.value, updatedAt: Date.now() })}
                  className="w-8 h-8 rounded bg-transparent border border-white/10"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ROLES.map((role) => {
                const agent = activeTeam.agents.find((a) => a.role === role)!;
                return (
                  <AgentEditor
                    key={agent.id}
                    agent={agent}
                    onChange={(next) =>
                      upsertTeam({
                        ...activeTeam,
                        agents: activeTeam.agents.map((a) => (a.id === next.id ? next : a)),
                        updatedAt: Date.now(),
                      })
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
