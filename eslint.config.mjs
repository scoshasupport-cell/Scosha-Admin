import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "backend/**",
    // Vite build output copied into the storefront; never lint minified bundles.
    "admin/dist/**",
    "public/admin/**",
  ]),
  {
    // These rules exist for React Compiler readiness. The storefront does not enable the
    // compiler, so they are reported as warnings (visible in `npm run lint`) rather than
    // blocking the build. Remaining sites: see PHASE2_REPORT.md "Frontend".
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);
