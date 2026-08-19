import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated live-readiness operator evidence + one-shot scratch scripts
    // (logs/JSON/_*.js under docs/artifacts only — not app/source).
    "docs/artifacts/live-readiness/**",
    // Node operator scripts (CommonJS)
    "scripts/**/*.cjs",
  ]),
]);

export default eslintConfig;
