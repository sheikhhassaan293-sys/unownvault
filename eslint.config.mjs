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
    "scripts/actions-demo-stub.ts",
    "scripts/live-content-demo-stub.ts",
    "scripts/game-events-demo-stub.ts",
    "build/**",
    "next-env.d.ts",
    "preview/**",
    "out/**",
    "scripts/actions-demo-stub.ts",
    "scripts/live-content-demo-stub.ts",
    "scripts/game-events-demo-stub.ts",
  ]),
]);

export default eslintConfig;
