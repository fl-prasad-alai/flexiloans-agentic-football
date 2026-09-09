"use client";

import { CAMERA_VIEWS, type CameraView } from "./CameraRig";

export function CameraSwitcher({ view, onChange }: { view: CameraView; onChange: (v: CameraView) => void }) {
  return (
    <div
      className="absolute top-3 left-3 z-10 flex gap-1 rounded-xl border px-2 py-1.5 backdrop-blur"
      style={{ background: "var(--hud-bg)", borderColor: "var(--hud-border)" }}
    >
      {CAMERA_VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className="px-2 py-1 rounded-lg text-[11px] font-mono transition"
          style={{
            background: view === v.id ? "var(--accent)" : "transparent",
            color: view === v.id ? "#05070d" : "inherit",
          }}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
