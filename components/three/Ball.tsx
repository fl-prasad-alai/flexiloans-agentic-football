"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";
import { flightHeight, GROUND_HEIGHT } from "@/lib/three/arc";
import { interpolatedBall, type RenderRefs } from "@/lib/three/interpolate";
import { getBallTexture, getGlowTexture } from "@/lib/three/textures";

const RADIUS = 0.32;

export function Ball({ refs, accentColor }: { refs: RenderRefs; accentColor: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => getBallTexture(), []);
  const glowTexture = useMemo(() => getGlowTexture(), []);
  const lastPos = useRef(new THREE.Vector3(0, GROUND_HEIGHT, 0));

  useFrame(() => {
    if (!mesh.current) return;
    const b = interpolatedBall(refs);
    const h = b.flight ? flightHeight(b.flight, b.progress) : GROUND_HEIGHT;
    const newPos = new THREE.Vector3(b.x, h, b.y);
    const moved = newPos.clone().sub(lastPos.current);
    const dist = moved.length();

    if (dist > 0.0004) {
      const axis = new THREE.Vector3(-moved.z, 0, moved.x);
      if (axis.lengthSq() > 1e-8) {
        axis.normalize();
        mesh.current.rotateOnWorldAxis(axis, dist / RADIUS);
      }
    }
    mesh.current.position.copy(newPos);
    lastPos.current.copy(newPos);

    if (glow.current) {
      glow.current.visible = dist > 0.12;
      const s = 0.9 + Math.min(1.6, dist * 3.2);
      glow.current.scale.set(s, s, s);
      glow.current.position.copy(newPos);
    }
  });

  return (
    <>
      <Trail width={2.4} length={5} color={accentColor} attenuation={(t) => t * t}>
        <mesh ref={mesh} castShadow position={[0, GROUND_HEIGHT, 0]}>
          <sphereGeometry args={[RADIUS, 20, 20]} />
          <meshStandardMaterial map={texture} roughness={0.4} metalness={0} />
        </mesh>
      </Trail>
      <sprite ref={glow} visible={false}>
        <spriteMaterial
          map={glowTexture}
          color={accentColor}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.55}
        />
      </sprite>
    </>
  );
}
