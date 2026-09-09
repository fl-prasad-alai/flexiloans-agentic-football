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
