"use client";

import { useMemo } from "react";
import { PITCH } from "@/lib/engine/pitch";
import { buildCrowdTexture } from "@/lib/three/textures";
import type { PitchTheme } from "@/lib/engine/types";
import type { ThreeThemeColors } from "@/lib/three/theme";

export function Stadium({ theme, colors }: { theme: PitchTheme; colors: ThreeThemeColors }) {
  const crowdTex = useMemo(() => {
    const t = buildCrowdTexture(colors);
    t.repeat.set(8, 1);
    return t;
  }, [colors]);

  const isNight = theme === "stadium-night";
  const isMinimal = theme === "minimal-turf";

  const sunColor = isNight ? "#bcd6ff" : isMinimal ? "#fff7e8" : "#fff4dd";
  const sunIntensity = isNight ? 2.6 : isMinimal ? 2.4 : 3.2;
  const ambient = isNight ? 0.65 : isMinimal ? 0.9 : 0.8;

  const pw = PITCH.xMax - PITCH.xMin;
  const ph = PITCH.yMax - PITCH.yMin;
  const standDistZ = ph / 2 + 14;
  const standDistX = pw / 2 + 18;

  const floodlightRigs: [number, number][] = [
    [-standDistX, -standDistZ],
    [standDistX, -standDistZ],
    [-standDistX, standDistZ],
    [standDistX, standDistZ],
  ];

  return (
    <>
      <color attach="background" args={[colors.stadiumBgA]} />
      {!isMinimal && <fog attach="fog" args={[colors.stadiumBgA, 65, 195]} />}

      <hemisphereLight args={[isNight ? "#3a4a7a" : "#bcdcff", colors.grassA, ambient]} />
      <directionalLight
        castShadow
        color={sunColor}
        intensity={sunIntensity}
        position={[30, 45, 20]}
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={160}
      />

      {isNight &&
        floodlightRigs.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position-y={9}>
              <cylinderGeometry args={[0.18, 0.22, 18, 8]} />
              <meshStandardMaterial color="#1a2033" metalness={0} roughness={0.8} />
            </mesh>
            <mesh position-y={18.2}>
              <boxGeometry args={[2.4, 1.4, 0.3]} />
              <meshStandardMaterial color="#eef6ff" emissive="#eef6ff" emissiveIntensity={2.2} metalness={0} />
            </mesh>
            <pointLight position={[0, 18, 0]} intensity={900} distance={90} decay={2} color="#dbeeff" />
          </group>
        ))}

      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} position={[0, 6, s * standDistZ]} rotation-y={s > 0 ? Math.PI : 0}>
          <planeGeometry args={[pw + 30, 14]} />
          <meshStandardMaterial map={crowdTex} roughness={1} metalness={0} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} position={[s * standDistX, 6, 0]} rotation-y={s > 0 ? -Math.PI / 2 : Math.PI / 2}>
          <planeGeometry args={[ph + 20, 14]} />
          <meshStandardMaterial map={crowdTex} roughness={1} metalness={0} />
        </mesh>
      ))}
    </>
  );
}
