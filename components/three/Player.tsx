"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Role, TeamConfig } from "@/lib/engine/types";
import { interpolatedPlayerPos, type RenderRefs } from "@/lib/three/interpolate";
import { getRoleTagTexture } from "@/lib/three/textures";

const SKIN = "#caa07a";

function dampAngle(current: number, target: number, delta: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const rate = 1 - Math.pow(0.0005, delta);
  return current + diff * rate;
}

export function Player({
  id,
  role,
  team,
  refs,
}: {
  id: string;
  role: Role;
  team: TeamConfig;
  refs: RenderRefs;
}) {
  const group = useRef<THREE.Group>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const staminaRing = useRef<THREE.Mesh>(null);
  const possessionGlow = useRef<THREE.Mesh>(null);
  const facingRef = useRef(0);
  const phaseRef = useRef(0);
  const lungeRef = useRef(0);

  const roleTag = useMemo(() => getRoleTagTexture(role), [role]);

  useFrame((_, delta) => {
    const data = interpolatedPlayerPos(id, refs);
    if (!data || !group.current) return;

    group.current.position.x = data.x;
    group.current.position.z = data.y;

    const speed = Math.hypot(data.vx, data.vy);
    if (speed > 0.015) {
      const targetAngle = Math.atan2(data.vx, data.vy);
      facingRef.current = dampAngle(facingRef.current, targetAngle, delta);
    }
    group.current.rotation.y = facingRef.current;

    const speedNorm = Math.min(1, speed / 3.2);
    phaseRef.current += delta * (3.4 + speedNorm * 11);
    const swing = Math.sin(phaseRef.current) * (0.12 + speedNorm * 0.6);

    // A slide tackle or a keeper diving to close down a shot gets a lunging, ground-hugging pose
    // instead of the normal running cycle — smoothed so it eases in/out rather than snapping.
    const wantLunge = data.sliding || (role === "GK" && data.sprinting);
    lungeRef.current += ((wantLunge ? 1 : 0) - lungeRef.current) * Math.min(1, delta * 9);
    const lunge = lungeRef.current;
    const runAmount = 1 - lunge;

    if (leftLeg.current) leftLeg.current.rotation.x = swing * runAmount + lunge * 1.0;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing * runAmount - lunge * 0.55;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.75 * runAmount - lunge * 0.6;
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.75 * runAmount + lunge * 0.9;
    if (bodyGroup.current) bodyGroup.current.rotation.x = lunge * (Math.PI * 0.4);

    const bob = Math.abs(Math.sin(phaseRef.current * 2)) * (0.02 + speedNorm * 0.06);
    group.current.position.y = bob - lunge * 0.4;

    if (staminaRing.current) {
      const mat = staminaRing.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(data.stamina > 0.6 ? 0x4ade80 : data.stamina > 0.3 ? 0xfacc15 : 0xf87171);
    }
    if (possessionGlow.current) {
      possessionGlow.current.visible = data.hasBall;
      const s = 1 + Math.sin(performance.now() * 0.006) * 0.1;
      possessionGlow.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={group}>
      <mesh ref={staminaRing} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={possessionGlow} rotation-x={-Math.PI / 2} position-y={0.015} visible={false}>
        <ringGeometry args={[0.48, 0.58, 32]} />
        <meshBasicMaterial color={team.secondaryColor} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>

      <group ref={leftLeg} position={[-0.11, 0.55, 0]}>
        <mesh castShadow position-y={-0.24}>
          <capsuleGeometry args={[0.085, 0.4, 4, 8]} />
          <meshStandardMaterial color={team.secondaryColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.11, 0.55, 0]}>
        <mesh castShadow position-y={-0.24}>
          <capsuleGeometry args={[0.085, 0.4, 4, 8]} />
          <meshStandardMaterial color={team.secondaryColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      <group ref={bodyGroup} position-y={1.0}>
        <mesh castShadow>
          <capsuleGeometry args={[0.25, 0.44, 4, 8]} />
          <meshStandardMaterial color={team.primaryColor} roughness={0.65} metalness={0} />
        </mesh>
        <mesh castShadow position-y={0.5}>
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} metalness={0} />
        </mesh>
        <sprite position-y={0.86} scale={[0.5, 0.25, 1]}>
          <spriteMaterial map={roleTag} depthWrite={false} />
        </sprite>

        <group ref={leftArm} position={[-0.29, 0.16, 0]}>
          <mesh castShadow position-y={-0.2}>
            <capsuleGeometry args={[0.06, 0.32, 4, 8]} />
            <meshStandardMaterial color={team.primaryColor} roughness={0.7} metalness={0} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.29, 0.16, 0]}>
          <mesh castShadow position-y={-0.2}>
            <capsuleGeometry args={[0.06, 0.32, 4, 8]} />
            <meshStandardMaterial color={team.primaryColor} roughness={0.7} metalness={0} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
