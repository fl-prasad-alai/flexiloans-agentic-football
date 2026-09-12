"use client";

import { useMemo } from "react";
import { PITCH } from "@/lib/engine/pitch";
import { buildGrassTexture } from "@/lib/three/textures";
import type { ThreeThemeColors } from "@/lib/three/theme";

export function Field({ colors }: { colors: ThreeThemeColors }) {
  const texture = useMemo(() => buildGrassTexture(colors), [colors]);
  const pw = PITCH.xMax - PITCH.xMin;
  const ph = PITCH.yMax - PITCH.yMin;

  return (
    <group>
      {/* Plain apron beyond the touchlines/goal lines, sized independently of the marked pitch. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[pw * 1.6, ph * 1.8]} />
        <meshStandardMaterial color={colors.grassA} roughness={1} metalness={0} />
      </mesh>
      {/* The marked pitch itself, sized to exactly match PITCH extents so markings line up with player coordinates. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[pw, ph]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
