"use client";

import { useEffect, useState } from "react";
import type { PitchTheme } from "@/lib/engine/types";

export interface ThreeThemeColors {
  stadiumBgA: string;
  stadiumBgB: string;
  grassA: string;
  grassB: string;
  grassLine: string;
  grassLogo: string;
  grassLogoStroke: string;
  crowd: string;
  accent: string;
  accent2: string;
}

const VARS: Record<keyof ThreeThemeColors, string> = {
  stadiumBgA: "--stadium-bg-a",
  stadiumBgB: "--stadium-bg-b",
  grassA: "--grass-a",
  grassB: "--grass-b",
  grassLine: "--grass-line",
  grassLogo: "--grass-logo",
  grassLogoStroke: "--grass-logo-stroke",
  crowd: "--crowd",
  accent: "--accent",
  accent2: "--accent-2",
};

const FALLBACK: ThreeThemeColors = {
  stadiumBgA: "#050912",
  stadiumBgB: "#0d1730",
  grassA: "#0e3d24",
  grassB: "#12492b",
  grassLine: "rgba(255,255,255,0.82)",
  grassLogo: "rgba(255,255,255,0.16)",
  grassLogoStroke: "rgba(255,255,255,0.4)",
  crowd: "#101a30",
  accent: "#5ee1ff",
  accent2: "#ffcf4d",
};

/** Themes live as CSS custom properties (see globals.css); three.js materials need real
 * color strings, so we resolve them once per theme via a throwaway probe element rather
 * than hand-duplicating the palette here. */
function readColors(theme: PitchTheme): ThreeThemeColors {
  const probe = document.createElement("div");
  probe.setAttribute("data-theme", theme);
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = {} as ThreeThemeColors;
  (Object.keys(VARS) as (keyof ThreeThemeColors)[]).forEach((k) => {
    const v = cs.getPropertyValue(VARS[k]).trim();
    out[k] = v || FALLBACK[k];
  });
  document.body.removeChild(probe);
  return out;
}

export function useThemeColors(theme: PitchTheme): ThreeThemeColors {
  const [colors, setColors] = useState<ThreeThemeColors>(FALLBACK);
  useEffect(() => {
    setColors(readColors(theme));
  }, [theme]);
  return colors;
}
