import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The live match page drives an imperative, tick-based simulation engine (lib/engine/match.ts)
    // from a ref, syncing a plain-object snapshot into React state each tick — the same pattern used
    // for any external mutable system (game loops, canvas/WebGL integrations). The React Compiler
    // rules assume all render-affecting state is React-owned, which doesn't fit that pattern.
    files: ["app/match/page.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    // The 3D pitch (components/three/**) is a react-three-fiber scene: an imperative WebGL
    // render loop driven by useFrame, wall-clock interpolation between engine tick snapshots
    // (performance.now()), and cosmetic particle effects (Math.random()). None of that is
    // React-owned render state, so the same exception as app/match/page.tsx applies here —
    // plus "purity" for the impure timing/randomness calls the rig legitimately needs.
    files: ["components/three/**", "lib/three/**"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
