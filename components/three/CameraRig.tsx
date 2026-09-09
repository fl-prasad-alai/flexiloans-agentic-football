"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { interpolatedBall, type RenderRefs } from "@/lib/three/interpolate";

export type CameraView = "broadcast" | "sideline" | "behindGoal" | "tactical" | "free";

export const CAMERA_VIEWS: { id: CameraView; label: string }[] = [
  { id: "broadcast", label: "Broadcast" },
  { id: "sideline", label: "Sideline" },
  { id: "behindGoal", label: "Behind Goal" },
  { id: "tactical", label: "Tactical" },
  { id: "free", label: "Free" },
];

export function CameraRig({ view, refs, shakeSeed }: { view: CameraView; refs: RenderRefs; shakeSeed: number }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 22, 38));
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const shakeUntil = useRef(0);
  const shakeMag = useRef(0);

  useEffect(() => {
    if (shakeSeed === 0) return;
    shakeUntil.current = performance.now() + 260;
    shakeMag.current = 0.55;
  }, [shakeSeed]);

  useFrame((_, delta) => {
    if (view === "free") return;

    const ball = interpolatedBall(refs);
    const bx = THREE.MathUtils.clamp(ball.x, -55, 55);
    const bz = THREE.MathUtils.clamp(ball.y, -35, 35);

    let desiredPos: THREE.Vector3;
    let desiredLook: THREE.Vector3;

    if (view === "sideline") {
      desiredPos = new THREE.Vector3(bx * 0.75, 4.2, 30);
      desiredLook = new THREE.Vector3(bx, 1.2, bz);
    } else if (view === "behindGoal") {
      const side = bx >= 0 ? 1 : -1;
      desiredPos = new THREE.Vector3(side * 64, 5.5, bz * 0.25);
      desiredLook = new THREE.Vector3(side * 20, 1.2, bz * 0.1);
    } else if (view === "tactical") {
      desiredPos = new THREE.Vector3(bx * 0.15, 58, bz * 0.15 + 2);
      desiredLook = new THREE.Vector3(bx * 0.15, 0, bz * 0.15);
    } else {
      desiredPos = new THREE.Vector3(bx * 0.32, 22, 38);
      desiredLook = new THREE.Vector3(bx * 0.55, 0.4, bz * 0.65);
    }

    const damp = 1 - Math.pow(0.0025, delta);
    camPos.current.lerp(desiredPos, damp);
    lookTarget.current.lerp(desiredLook, damp);

    let px = camPos.current.x;
    let py = camPos.current.y;
    let pz = camPos.current.z;
    const now = performance.now();
    if (now < shakeUntil.current) {
      const k = (shakeUntil.current - now) / 260;
      px += (Math.random() - 0.5) * shakeMag.current * k;
      py += (Math.random() - 0.5) * shakeMag.current * k * 0.5;
      pz += (Math.random() - 0.5) * shakeMag.current * k;
    }
    camera.position.set(px, py, pz);
    camera.lookAt(lookTarget.current);
  });

  return view === "free" ? (
    <OrbitControls
      makeDefault
      target={[0, 0.5, 0]}
      maxDistance={100}
      minDistance={10}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  ) : null;
}
