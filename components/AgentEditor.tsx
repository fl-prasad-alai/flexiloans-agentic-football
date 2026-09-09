"use client";

import { personalityForPreset, PRESET_LABELS, ROLE_LABELS } from "@/lib/engine/presets";
import type { AgentConfig, AgentPersonality, Preset } from "@/lib/engine/types";

const PRESETS: Exclude<Preset, "custom">[] = ["balanced", "aggressive", "defensive", "possession", "counter"];

const SLIDERS: { key: keyof AgentPersonality; label: string; lo: string; hi: string }[] = [
  { key: "aggression", label: "Aggression", lo: "Cautious", hi: "Full-throttle" },
  { key: "passDirectness", label: "Pass style", lo: "Short & safe", hi: "Line-breaking" },
  { key: "workRate", label: "Work rate", lo: "Conserves", hi: "Relentless" },
  { key: "shootBoldness", label: "Shot boldness", lo: "Picky", hi: "Shoots on sight" },
  { key: "discipline", label: "Discipline", lo: "Free role", hi: "Holds shape" },
];

export function AgentEditor({
  agent,
  onChange,
}: {
  agent: AgentConfig;
  onChange: (next: AgentConfig) => void;
}) {
  const roleInfo = ROLE_LABELS[agent.role];

  function setPreset(preset: Preset) {
    onChange({ ...agent, preset, personality: personalityForPreset(agent.role, preset) });
  }

  function setSlider(key: keyof AgentPersonality, v: number) {
    onChange({ ...agent, preset: "custom", personality: { ...agent.personality, [key]: v } });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">{roleInfo.label}</div>
          <div className="text-[11px] text-white/30">{roleInfo.blurb}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/10 grid place-items-center font-mono text-sm">
          #{agent.jerseyNumber}
        </div>
      </div>

      <input
        value={agent.name}
        onChange={(e) => onChange({ ...agent, name: e.target.value })}
        placeholder="Agent name"
        className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/40"
      />

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            title={PRESET_LABELS[p].blurb}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
              agent.preset === p
                ? "bg-white text-black border-white"
                : "border-white/15 text-white/60 hover:border-white/40"
            }`}
          >
            {PRESET_LABELS[p].label}
          </button>
        ))}
        {agent.preset === "custom" && (
          <span className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-white/30 text-white/50">
            Custom
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex justify-between text-[11px] text-white/50 mb-1">
              <span>{s.label}</span>
              <span className="font-mono">{Math.round(agent.personality[s.key] * 100)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(agent.personality[s.key] * 100)}
              onChange={(e) => setSlider(s.key, Number(e.target.value) / 100)}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-[10px] text-white/25">
              <span>{s.lo}</span>
              <span>{s.hi}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
