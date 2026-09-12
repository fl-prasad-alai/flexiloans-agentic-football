"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildNetTexture } from "@/lib/three/textures";

const GOAL_WIDTH = 14; // matches PITCH.goalWidth: y from -7 to 7
const GOAL_HEIGHT = 4.2;
const GOAL_DEPTH = 2.4;
const POST_R = 0.09;

export function Goal({ x, netHitAt }: { x: number; netHitAt: MutableRefObject<number> }) {
  const net = useRef<THREE.Group>(null);
  const netTexture = useMemo(() => buildNetTexture(), []);
  const dir = x > 0 ? 1 : -1; // net extends outward, away from the pitch

  useFrame(() => {
    if (!net.current) return;
    const since = performance.now() - netHitAt.current;
    if (since >= 0 && since < 450) {
      const k = 1 - since / 450;
      net.current.position.x = dir * Math.sin(since * 0.06) * 0.18 * k;
    } else {
      net.current.position.x = 0;
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh castShadow position={[0, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2]}>
        <cylinderGeometry args={[POST_R, POST_R, GOAL_HEIGHT, 12]} />
        <meshStandardMaterial color="#f4f6fb" roughness={0.3} metalness={0} />
      </mesh>
      <mesh castShadow position={[0, GOAL_HEIGHT / 2, GOAL_WIDTH / 2]}>
        <cylinderGeometry args={[POST_R, POST_R, GOAL_HEIGHT, 12]} />
        <meshStandardMaterial color="#f4f6fb" roughness={0.3} metalness={0} />
      </mesh>
      <mesh castShadow position={[0, GOAL_HEIGHT, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[POST_R, POST_R, GOAL_WIDTH, 12]} />
        <meshStandardMaterial color="#f4f6fb" roughness={0.3} metalness={0} />
      </mesh>

      <group ref={net}>
        <mesh position={[dir * GOAL_DEPTH, GOAL_HEIGHT / 2, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[GOAL_WIDTH, GOAL_HEIGHT]} />
          <meshBasicMaterial map={netTexture} transparent side={THREE.DoubleSide} opacity={0.9} />
        </mesh>
        <mesh position={[dir * GOAL_DEPTH * 0.5, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2]}>
          <planeGeometry args={[GOAL_DEPTH, GOAL_HEIGHT]} />
          <meshBasicMaterial map={netTexture} transparent side={THREE.DoubleSide} opacity={0.9} />
        </mesh>
        <mesh position={[dir * GOAL_DEPTH * 0.5, GOAL_HEIGHT / 2, GOAL_WIDTH / 2]}>
          <planeGeometry args={[GOAL_DEPTH, GOAL_HEIGHT]} />
          <meshBasicMaterial map={netTexture} transparent side={THREE.DoubleSide} opacity={0.9} />
        </mesh>
        <mesh position={[dir * GOAL_DEPTH * 0.5, GOAL_HEIGHT, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[GOAL_WIDTH, GOAL_DEPTH]} />
          <meshBasicMaterial map={netTexture} transparent side={THREE.DoubleSide} opacity={0.85} />
        </mesh>
      </group>
    </group>
  );
}
