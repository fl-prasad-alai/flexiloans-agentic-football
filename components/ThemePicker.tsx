"use client";

import type { PitchTheme } from "@/lib/engine/types";

const THEMES: { id: PitchTheme; name: string; blurb: string; a: string; b: string; bg: string; accent: string }[] = [
  {
    id: "stadium-night",
    name: "Stadium Night",
    blurb: "Floodlit night match, neon HUD, broadcast drama.",
    a: "#0e3d24",
    b: "#12492b",
    bg: "linear-gradient(135deg,#050912,#0d1730)",
    accent: "#5ee1ff",
  },
  {
    id: "broadcast-day",
    name: "Broadcast Day",
    blurb: "Bright sunny derby with crisp TV-graphics styling.",
    a: "#3c9a4a",
    b: "#46a854",
    bg: "linear-gradient(135deg,#bfe0ff,#eaf6ff)",
    accent: "#0b6efd",
  },
  {
    id: "minimal-turf",
    name: "Minimal Turf",
    blurb: "Clean flat-design pitch built to match the FlexiLoans brand.",
    a: "#1f6b3a",
    b: "#24793f",
    bg: "#f4f1ea",
    accent: "#ff6a2c",
  },
];

export function ThemePicker({ value, onChange }: { value: PitchTheme; onChange: (t: PitchTheme) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {THEMES.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`rounded-2xl overflow-hidden border-2 text-left transition ${
              active ? "border-white scale-[1.02]" : "border-white/10 hover:border-white/30"
            }`}
          >
            <div className="h-28 relative" style={{ background: t.bg }}>
              <div className="absolute inset-3 rounded-lg overflow-hidden flex">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex-1 h-full" style={{ background: i % 2 ? t.b : t.a }} />
                ))}
              </div>
              <div className="absolute inset-3 rounded-lg border border-white/70 grid place-items-center">
                <div
                  className="w-8 h-8 rounded-full border border-white/70 grid place-items-center text-[10px] font-bold text-white/80"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  FL
                </div>
              </div>
            </div>
            <div className="p-3 bg-black/40">
              <div className="font-display text-lg tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.accent }} />
                {t.name}
              </div>
              <div className="text-xs text-white/60 mt-0.5">{t.blurb}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
