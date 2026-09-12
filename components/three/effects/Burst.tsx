"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGlowTexture } from "@/lib/three/textures";

export interface BurstSpec {
  id: number;
  position: [number, number, number];
  color: string;
  count: number;
  spread: number;
  life: number; // ms
}

const GRAVITY = 4.5;

/** A short-lived puff of particles for kicks/tackles/goals — spawned by Pitch3D and
 * unmounted via onDone once its `life` elapses. Purely cosmetic, no gameplay coupling. */
export function Burst({ spec, onDone }: { spec: BurstSpec; onDone: (id: number) => void }) {
  const pointsRef = useRef<THREE.Points>(null);
  const startRef = useRef(performance.now());
  const glowTex = useMemo(() => getGlowTexture(), []);

  const velocities = useMemo(() => {
    const arr = new Float32Array(spec.count * 3);
    for (let i = 0; i < spec.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random()) * spec.spread;
      arr[i * 3] = Math.cos(theta) * speed;
      arr[i * 3 + 1] = 1.2 + Math.random() * 2.4;
      arr[i * 3 + 2] = Math.sin(theta) * speed;
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const positions = useMemo(() => {
    const arr = new Float32Array(spec.count * 3);
    for (let i = 0; i < spec.count; i++) {
      arr[i * 3] = spec.position[0];
      arr[i * 3 + 1] = spec.position[1];
      arr[i * 3 + 2] = spec.position[2];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => onDone(spec.id), spec.life);
    return () => clearTimeout(t);
  }, [spec.id, spec.life, onDone]);

  useFrame(() => {
    const geom = pointsRef.current?.geometry;
    if (!geom) return;
    const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
    const elapsed = (performance.now() - startRef.current) / 1000;
    for (let i = 0; i < spec.count; i++) {
      const vx = velocities[i * 3];
      const vy0 = velocities[i * 3 + 1];
      const vz = velocities[i * 3 + 2];
      posAttr.array[i * 3] = spec.position[0] + vx * elapsed;
      posAttr.array[i * 3 + 1] = Math.max(0.02, spec.position[1] + vy0 * elapsed - 0.5 * GRAVITY * elapsed * elapsed);
      posAttr.array[i * 3 + 2] = spec.position[2] + vz * elapsed;
    }
    posAttr.needsUpdate = true;
    const mat = pointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (mat) mat.opacity = Math.max(0, 1 - elapsed / (spec.life / 1000));
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.34}
        map={glowTex}
        color={spec.color}
        transparent
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
