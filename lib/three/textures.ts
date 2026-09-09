import * as THREE from "three";
import { PITCH } from "@/lib/engine/pitch";
import type { Role } from "@/lib/engine/types";
import type { ThreeThemeColors } from "./theme";

const TEX_W = 1536;
const TEX_H = Math.round(TEX_W * ((PITCH.yMax - PITCH.yMin) / (PITCH.xMax - PITCH.xMin)));

function worldToPx(x: number, y: number) {
  const w = PITCH.xMax - PITCH.xMin;
  const h = PITCH.yMax - PITCH.yMin;
  return {
    px: ((x - PITCH.xMin) / w) * TEX_W,
    py: ((y - PITCH.yMin) / h) * TEX_H,
  };
}

function metersPx(m: number) {
  return (m / (PITCH.xMax - PITCH.xMin)) * TEX_W;
}

/** Grass stripes + all pitch markings + the FL crest, baked into one texture matching
 * the exact PITCH extents so it maps 1:1 to player world coordinates. */
export function buildGrassTexture(colors: ThreeThemeColors): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;

  const stripes = 12;
  const stripeW = TEX_W / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.grassB : colors.grassA;
    ctx.fillRect(i * stripeW, 0, stripeW, TEX_H);
  }

  const center = worldToPx(0, 0);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 5;
  ctx.strokeStyle = colors.grassLogoStroke;
  ctx.fillStyle = colors.grassLogo;
  ctx.beginPath();
  ctx.arc(center.px, center.py - 46, 86, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.grassLogoStroke;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 108px Arial, sans-serif";
  ctx.fillText("FL", center.px, center.py - 34);
  ctx.font = "bold 32px Arial, sans-serif";
  ctx.save();
  try {
    ctx.letterSpacing = "16px";
  } catch {
    // letterSpacing unsupported in this canvas backend — falls back to tight text, harmless.
  }
  ctx.fillText("FLEXILOANS", center.px, center.py + 60);
  ctx.restore();
  ctx.restore();

  ctx.strokeStyle = colors.grassLine;
  ctx.lineWidth = 4;
  const tl = worldToPx(PITCH.xMin, PITCH.yMin);
  const br = worldToPx(PITCH.xMax, PITCH.yMax);
  ctx.strokeRect(tl.px, tl.py, br.px - tl.px, br.py - tl.py);
  ctx.beginPath();
  ctx.moveTo(center.px, tl.py);
  ctx.lineTo(center.px, br.py);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center.px, center.py, metersPx(PITCH.centerCircleRadius), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = colors.grassLine;
  ctx.beginPath();
  ctx.arc(center.px, center.py, 5, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1] as const) {
    const gx = side === -1 ? PITCH.xMin : PITCH.xMax;
    const pbX = side === -1 ? PITCH.xMin + PITCH.penaltyBoxX : PITCH.xMax - PITCH.penaltyBoxX;
    const p1 = worldToPx(gx, -PITCH.penaltyBoxY);
    const p2 = worldToPx(pbX, PITCH.penaltyBoxY);
    ctx.strokeRect(Math.min(p1.px, p2.px), Math.min(p1.py, p2.py), Math.abs(p2.px - p1.px), Math.abs(p2.py - p1.py));

    const sixX = side === -1 ? PITCH.xMin + 5.5 : PITCH.xMax - 5.5;
    const s1 = worldToPx(gx, -9.15);
    const s2 = worldToPx(sixX, 9.15);
    ctx.strokeRect(Math.min(s1.px, s2.px), Math.min(s1.py, s2.py), Math.abs(s2.px - s1.px), Math.abs(s2.py - s1.py));

    const spot = worldToPx(side === -1 ? PITCH.xMin + 11 : PITCH.xMax - 11, 0);
    ctx.beginPath();
    ctx.arc(spot.px, spot.py, 5, 0, Math.PI * 2);
    ctx.fill();

    for (const cy of [PITCH.yMin, PITCH.yMax]) {
      const corner = worldToPx(gx, cy);
      ctx.beginPath();
      ctx.arc(corner.px, corner.py, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function buildNetTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 4);
  tex.needsUpdate = true;
  return tex;
}

function drawPentagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

let ballTex: THREE.CanvasTexture | null = null;
export function getBallTexture(): THREE.CanvasTexture {
  if (ballTex) return ballTex;
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f6f6f4";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#171717";
  const spots: [number, number, number][] = [
    [128, 128, 46],
    [384, 100, 46],
    [640, 128, 46],
    [896, 100, 46],
    [0, 260, 46],
    [256, 300, 46],
    [512, 270, 46],
    [768, 300, 46],
    [1024, 260, 46],
    [128, 440, 46],
    [384, 460, 46],
    [640, 440, 46],
    [896, 460, 46],
  ];
  for (const [x, y, r] of spots) drawPentagon(ctx, x, y, r);
  ballTex = new THREE.CanvasTexture(canvas);
  ballTex.needsUpdate = true;
  ballTex.anisotropy = 4;
  return ballTex;
}

export function buildCrowdTexture(colors: ThreeThemeColors): THREE.CanvasTexture {
  const w = 640;
  const h = 160;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = colors.crowd;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * w;
    const y = h * 0.3 + Math.random() * h * 0.7;
    const shade = 50 + Math.floor(Math.random() * 170);
    ctx.fillStyle = `rgba(${shade},${shade},${shade + 10},0.85)`;
    ctx.fillRect(x, y, 2.6, 3.4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const ROLE_LABEL: Record<Role, string> = { GK: "GK", DEF: "D", MID: "M", FWD1: "F1", FWD2: "F2" };
const roleTagCache = new Map<Role, THREE.CanvasTexture>();
export function getRoleTagTexture(role: Role): THREE.CanvasTexture {
  const cached = roleTagCache.get(role);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(5,7,13,0.72)";
  roundRect(ctx, 4, 12, 120, 40, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ROLE_LABEL[role], 64, 33);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  roleTagCache.set(role, tex);
  return tex;
}

let glowTex: THREE.CanvasTexture | null = null;
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTex) return glowTex;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(canvas);
  glowTex.needsUpdate = true;
  return glowTex;
}
