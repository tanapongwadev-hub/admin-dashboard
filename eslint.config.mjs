import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import designSystem from "./scripts/eslint-design-system.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    ignores: ["**/*.test.tsx", "**/*print*.tsx", "src/app/global-error.tsx", "src/components/ui/page-title.tsx"],
    plugins: { "design-system": designSystem },
    rules: { "design-system/consistent-styles": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Installed agent tooling and bundled third-party code are not app sources.
    ".agents/**",
    ".claude/**",
    ".ua/**", // Generated knowledge graphs and analysis scratch/trash.
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
