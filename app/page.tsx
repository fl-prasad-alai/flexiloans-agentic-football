"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Pitch } from "@/components/Pitch";
import { createHouseTeam } from "@/lib/engine/factory";
import { initMatch } from "@/lib/engine/match";

export default function Home() {
  const preview = useMemo(() => {
    const home = createHouseTeam();
    const away = createHouseTeam();
    away.id = "house-xi-away";
    away.primaryColor = "#e11d2e";
    away.crest = "🔥";
    away.shortCode = "RED";
    return initMatch({ home, away, totalTicks: 180, seed: 7 });
  }, []);

  return (
    <div data-theme="stadium-night" className="flex-1 flex flex-col" style={{ background: "var(--stadium-bg-a)" }}>
      <section
        className="flex-1 flex flex-col"
        style={{ background: "radial-gradient(circle at 50% -10%, var(--stadium-bg-b), var(--stadium-bg-a))" }}
      >
        <div className="max-w-6xl mx-auto w-full px-6 pt-16 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Powered by autonomous agent tactics
            </div>
            <h1 className="font-display text-6xl sm:text-7xl leading-[0.95] tracking-wide">
              Build Your <span style={{ color: "var(--accent)" }}>AI Football</span> Squad
            </h1>
            <p className="mt-6 text-white/60 max-w-lg text-lg">
              Configure five agents — goalkeeper, defender, midfielder and two forwards — tune how bold, disciplined
              and direct each one plays, then send them out to compete live against another squad on a fully animated
              pitch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/build"
                className="rounded-full bg-white text-black font-semibold px-6 py-3 hover:bg-white/90 transition"
              >
                Build Your Squad
              </Link>
              <Link
                href="/play"
                className="rounded-full border border-white/25 px-6 py-3 hover:border-white/50 transition"
              >
                Quick Match
              </Link>
            </div>
          </div>
          <div
            className="rounded-2xl border overflow-hidden aspect-[11/8] shadow-2xl"
            style={{ borderColor: "var(--hud-border)", background: "var(--crowd)", boxShadow: "var(--glow)" }}
          >
            <Pitch
              players={preview.state.players}
              ball={preview.state.ball}
              home={preview.homeConfig}
              away={preview.awayConfig}
            />
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Feature
            title="1. Configure Five Agents"
            body="Name your GK, DEF, MID and two forwards. Pick a tactical preset or hand-tune aggression, pass style, work rate, shot boldness and discipline."
          />
          <Feature
            title="2. Choose Your Stadium"
            body="Three visual designs to play in — Stadium Night, Broadcast Day, or the clean Minimal Turf look — each with the FlexiLoans crest mowed into the center circle."
          />
          <Feature
            title="3. Compete Live"
            body="Kick off against another squad or the House XI. Watch commands, passes, tackles and shots resolve tick by tick with live commentary."
          />
        </div>
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="font-display text-xl tracking-wide mb-2">{title}</div>
      <p className="text-sm text-white/50">{body}</p>
    </div>
  );
}
