"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { PITCH } from "@/lib/engine/pitch";
import type { MatchEvent, MatchState, PitchTheme, TeamConfig } from "@/lib/engine/types";
import { useThemeColors } from "@/lib/three/theme";
import type { RenderRefs } from "@/lib/three/interpolate";
import { Field } from "./Field";
import { Goal } from "./Goal";
import { Stadium } from "./Stadium";
import { Player } from "./Player";
import { Ball } from "./Ball";
import { CameraRig, type CameraView } from "./CameraRig";
import { CameraSwitcher } from "./CameraSwitcher";
import { Burst, type BurstSpec } from "./effects/Burst";

let burstSeq = 0;

export default function Pitch3D({
  matchState,
  newEvents,
  home,
  away,
  theme,
  tickIntervalMs,
}: {
  matchState: MatchState;
  newEvents: MatchEvent[];
  home: TeamConfig;
  away: TeamConfig;
  theme: PitchTheme;
  tickIntervalMs: number;
}) {
  const colors = useThemeColors(theme);
  const [view, setView] = useState<CameraView>("broadcast");
  const savedViewRef = useRef<CameraView>("broadcast");
  const goalCamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevStateRef = useRef(matchState);
  const latestStateRef = useRef(matchState);
  const changedAtRef = useRef(performance.now());

  useEffect(() => {
    prevStateRef.current = latestStateRef.current;
    latestStateRef.current = matchState;
    changedAtRef.current = performance.now();
    // Runs once per engine tick to roll the interpolation window forward; matchState.tick is the right dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchState.tick]);

  const refs: RenderRefs = { prevRef: prevStateRef, latestRef: latestStateRef, changedAtRef, tickIntervalMs };

  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  const removeBurst = useCallback((id: number) => {
    setBursts((b) => b.filter((x) => x.id !== id));
  }, []);
  const spawnBurst = useCallback((spec: Omit<BurstSpec, "id">) => {
    setBursts((b) => [...b, { ...spec, id: burstSeq++ }]);
  }, []);

  const homeNetHit = useRef(0);
  const awayNetHit = useRef(0);
  const [shake, setShake] = useState(0);

  const prevShotKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const flight = matchState.ball.flight;
    if (flight && flight.kind === "SHOT") {
      const key = `${flight.from.x},${flight.from.y},${flight.to.x},${flight.to.y}`;
      if (prevShotKeyRef.current !== key) {
        prevShotKeyRef.current = key;
        spawnBurst({ position: [flight.from.x, 0.4, flight.from.y], color: colors.accent2, count: 14, spread: 2.2, life: 500 });
        setShake((s) => s + 1);
      }
    } else {
      prevShotKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchState.tick]);

  useEffect(() => {
    for (const e of newEvents) {
      if (e.kind === "GOAL" && e.side) {
        const defendingX = e.side === "home" ? PITCH.xMax : PITCH.xMin;
        spawnBurst({ position: [defendingX, 1.4, 0], color: colors.accent, count: 46, spread: 5, life: 1400 });
        if (e.side === "home") awayNetHit.current = performance.now();
        else homeNetHit.current = performance.now();
        setShake((s) => s + 3);

        if (goalCamTimeoutRef.current) clearTimeout(goalCamTimeoutRef.current);
        setView("behindGoal");
        goalCamTimeoutRef.current = setTimeout(() => setView(savedViewRef.current), 2600);
      }
      if (e.kind === "TACKLE" && e.playerId) {
        const p = matchState.players.find((pl) => pl.id === e.playerId);
        if (p) {
          spawnBurst({ position: [p.pos.x, 0.15, p.pos.y], color: "#cabf9a", count: 10, spread: 1.4, life: 380 });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newEvents]);

  useEffect(
    () => () => {
      if (goalCamTimeoutRef.current) clearTimeout(goalCamTimeoutRef.current);
    },
    [],
  );

  function handleViewChange(v: CameraView) {
    savedViewRef.current = v;
    setView(v);
  }

  return (
    <div className="relative w-full h-full">
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault fov={42} near={0.4} far={260} position={[0, 22, 38]} />
        <CameraRig view={view} refs={refs} shakeSeed={shake} />
        <Stadium theme={theme} colors={colors} />
        <Field colors={colors} />
        <Goal x={PITCH.xMin} netHitAt={homeNetHit} />
        <Goal x={PITCH.xMax} netHitAt={awayNetHit} />

        {matchState.players.map((p) => (
          <Player key={p.id} id={p.id} role={p.role} team={p.side === "home" ? home : away} refs={refs} />
        ))}
        <Ball refs={refs} accentColor={colors.accent} />

        {bursts.map((b) => (
          <Burst key={b.id} spec={b} onDone={removeBurst} />
        ))}
      </Canvas>
      <CameraSwitcher view={view} onChange={handleViewChange} />
    </div>
  );
}
