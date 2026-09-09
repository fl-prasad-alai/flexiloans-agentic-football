"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ThemePicker } from "@/components/ThemePicker";
import { createHouseTeam } from "@/lib/engine/factory";
import type { PitchTheme, TeamConfig } from "@/lib/engine/types";
import { useMatchSetupStore } from "@/lib/store/matchSetupStore";
import { useTeamStore } from "@/lib/store/teamStore";

const LENGTHS = [
  { label: "Quick (5 min)", ticks: 90 },
  { label: "Standard (10 min)", ticks: 180 },
  { label: "Full (15 min)", ticks: 270 },
];

export default function PlayPage() {
  const teams = useTeamStore((s) => s.teams);
  const router = useRouter();
  const setPending = useMatchSetupStore((s) => s.setPending);

  const houseTeam = useMemo(() => createHouseTeam(), []);
  const opponents: TeamConfig[] = useMemo(() => [houseTeam, ...teams], [houseTeam, teams]);

  const [homeId, setHomeId] = useState<string | null>(teams[0]?.id ?? null);
  const [awayId, setAwayId] = useState<string | null>(houseTeam.id);
  const [theme, setTheme] = useState<PitchTheme>("stadium-night");
  const [ticks, setTicks] = useState(180);

  const home = teams.find((t) => t.id === homeId) ?? null;
  const away = opponents.find((t) => t.id === awayId) ?? null;

  function kickoff() {
    if (!home || !away) return;
    setPending({ home, away, totalTicks: ticks, theme });
    router.push("/match");
  }

  if (teams.length === 0) {
    return (
      <div className="flex-1 grid place-items-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-3xl mb-3">Build a squad first</h1>
          <p className="text-white/50 mb-6">You need at least one configured team before you can kick off a match.</p>
          <Link href="/build" className="rounded-xl bg-white text-black px-5 py-2.5 font-semibold inline-block">
            Go to Squad Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
      <Link href="/build" className="text-xs text-white/40 hover:text-white/70">
        ← Back to squad builder
      </Link>
      <h1 className="font-display text-4xl tracking-wide">Set Up The Match</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <TeamSelect label="Your team" teams={teams} value={homeId} onChange={setHomeId} />
        <TeamSelect label="Opponent" teams={opponents} value={awayId} onChange={setAwayId} />
      </div>

      <div>
        <h3 className="font-display text-xl tracking-wide mb-3">Choose Your Stadium</h3>
        <ThemePicker value={theme} onChange={setTheme} />
      </div>

      <div>
        <h3 className="font-display text-xl tracking-wide mb-3">Match Length</h3>
        <div className="flex gap-2">
          {LENGTHS.map((l) => (
            <button
              key={l.ticks}
              onClick={() => setTicks(l.ticks)}
              className={`px-4 py-2 rounded-xl border text-sm transition ${
                ticks === l.ticks ? "bg-white text-black border-white" : "border-white/15 hover:border-white/40"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={kickoff}
        disabled={!home || !away}
        className="mt-4 self-center rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-display text-2xl tracking-wide px-10 py-3 disabled:opacity-30 hover:scale-105 transition"
      >
        Kick Off ⚽
      </button>
    </div>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  onChange,
}: {
  label: string;
  teams: TeamConfig[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-widest text-white/40 mb-3">{label}</div>
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${
              value === t.id ? "border-white/50 bg-white/10" : "border-white/10 hover:border-white/25"
            }`}
          >
            <span className="w-6 h-6 rounded-full grid place-items-center text-xs" style={{ background: t.primaryColor }}>
              {t.crest}
            </span>
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
