"use client";

import { useMemo } from "react";
import type { BallState, PlayerState, TeamConfig } from "@/lib/engine/types";

const SCALE = 10;
const PAD = 55;
const PW = 1100;
const PH = 700;
const VB_X = -PAD;
const VB_Y = -PAD;
const VB_W = PW + PAD * 2;
const VB_H = PH + PAD * 2;

function toSvg(x: number, y: number) {
  return { X: x * SCALE + PW / 2, Y: y * SCALE + PH / 2 };
}

const ROLE_LABEL: Record<PlayerState["role"], string> = {
  GK: "GK",
  DEF: "D",
  MID: "M",
  FWD1: "F1",
  FWD2: "F2",
};

const STRIPES = 12;

export function Pitch({
  players,
  ball,
  home,
  away,
}: {
  players: PlayerState[];
  ball: BallState;
  home: TeamConfig;
  away: TeamConfig;
}) {
  const stripes = useMemo(() => {
    const stripeW = VB_W / STRIPES;
    return Array.from({ length: STRIPES }, (_, i) => ({
      x: VB_X + i * stripeW,
      w: stripeW,
      dark: i % 2 === 0,
    }));
  }, []);

  const ballPos = toSvg(ball.pos.x, ball.pos.y);

  return (
    <svg
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      className="w-full h-full select-none"
      style={{ filter: "var(--pitch-filter, none)" }}
    >
      <defs>
        <pattern id="net" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 0 L10 10 M10 0 L0 10" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        </pattern>
        <radialGradient id="ballHighlight" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d8d8d8" />
        </radialGradient>
      </defs>

      {/* Mowed grass stripes, extending into the run-off margin */}
      {stripes.map((s, i) => (
        <rect key={i} x={s.x} y={VB_Y} width={s.w} height={VB_H} fill={s.dark ? "var(--grass-b)" : "var(--grass-a)"} />
      ))}

      {/* FL crest mowed into the center circle, FLEXILOANS wordmark below it */}
      <g opacity={0.95}>
        <circle cx={PW / 2} cy={PH / 2 - 34} r={62} fill="none" stroke="var(--grass-logo-stroke)" strokeWidth={3} />
        <circle cx={PW / 2} cy={PH / 2 - 34} r={62} fill="var(--grass-logo)" />
        <text
          x={PW / 2}
          y={PH / 2 - 6}
          textAnchor="middle"
          className="font-display"
          style={{ fontSize: 78, fill: "var(--grass-logo-stroke)" }}
        >
          FL
        </text>
        <text
          x={PW / 2}
          y={PH / 2 + 58}
          textAnchor="middle"
          className="font-display"
          style={{ fontSize: 34, letterSpacing: "0.5em", fill: "var(--grass-logo-stroke)" }}
        >
          FLEXILOANS
        </text>
      </g>

      {/* Pitch markings */}
      <g fill="none" stroke="var(--grass-line)" strokeWidth={2.5}>
        <rect x={0} y={0} width={PW} height={PH} />
        <line x1={PW / 2} y1={0} x2={PW / 2} y2={PH} />
        <circle cx={PW / 2} cy={PH / 2} r={91.5} />
        <circle cx={PW / 2} cy={PH / 2} r={3.5} fill="var(--grass-line)" />
        {/* Penalty boxes */}
        <rect x={0} y={150} width={165} height={400} />
        <rect x={PW - 165} y={150} width={165} height={400} />
        {/* Six-yard boxes */}
        <rect x={0} y={258.5} width={55} height={183} />
        <rect x={PW - 55} y={258.5} width={55} height={183} />
        {/* Penalty spots */}
        <circle cx={110} cy={PH / 2} r={3.5} fill="var(--grass-line)" stroke="none" />
        <circle cx={PW - 110} cy={PH / 2} r={3.5} fill="var(--grass-line)" stroke="none" />
        {/* Corner arcs */}
        <path d={`M ${0} ${14} A 14 14 0 0 0 14 0`} />
        <path d={`M ${PW - 14} ${0} A 14 14 0 0 0 ${PW} ${14}`} />
        <path d={`M ${PW} ${PH - 14} A 14 14 0 0 0 ${PW - 14} ${PH}`} />
        <path d={`M ${14} ${PH} A 14 14 0 0 0 ${0} ${PH - 14}`} />
      </g>

      {/* Goals */}
      {[0, PW].map((gx, i) => (
        <g key={i}>
          <rect
            x={gx === 0 ? -18 : PW}
            y={PH / 2 - 70}
            width={18}
            height={140}
            fill="url(#net)"
            stroke="var(--grass-line)"
            strokeWidth={3}
          />
        </g>
      ))}

      {/* Players */}
      {players.map((p) => {
        const { X, Y } = toSvg(p.pos.x, p.pos.y);
        const team = p.side === "home" ? home : away;
        const staminaColor = p.stamina > 0.6 ? "#4ade80" : p.stamina > 0.3 ? "#facc15" : "#f87171";
        const dash = 2 * Math.PI * 20;
        return (
          <g key={p.id} transform={`translate(${X} ${Y})`} style={{ transition: "transform 300ms linear" }}>
            {p.hasBall && (
              <circle r={22} fill="none" stroke="var(--accent-2)" strokeWidth={2.5} opacity={0.9}>
                <animate attributeName="r" values="20;24;20" dur="1.1s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              r={20}
              fill="none"
              stroke={staminaColor}
              strokeWidth={2.5}
              strokeDasharray={`${dash * p.stamina} ${dash}`}
              transform="rotate(-90)"
              opacity={0.85}
            />
            <circle r={16} fill={team.primaryColor} stroke="#ffffff" strokeWidth={2} />
            <text
              y={5}
              textAnchor="middle"
              style={{ fontSize: 12, fontWeight: 700, fill: "#ffffff", fontFamily: "var(--font-mono)" }}
            >
              {ROLE_LABEL[p.role]}
            </text>
          </g>
        );
      })}

      {/* Ball */}
      <g transform={`translate(${ballPos.X} ${ballPos.Y})`} style={{ transition: "transform 220ms linear" }}>
        <circle r={9} fill="url(#ballHighlight)" stroke="#111827" strokeWidth={1.2} />
      </g>
    </svg>
  );
}
