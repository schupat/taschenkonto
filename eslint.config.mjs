import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginSecurity from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  pluginSecurity.configs.recommended,
  {
    plugins: {
      "no-secrets": noSecrets,
    },
    rules: {
      // Detect high-entropy strings that look like hardcoded secrets
      "no-secrets/no-secrets": ["error", { tolerance: 4.5 }],
    },
  },
  {
    // Relax security rules for seed/test files where patterns are intentional
    files: ["prisma/seed.ts", "**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "no-secrets/no-secrets": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "eslint-plugins/**",
  ]),
]);

export default eslintConfig;
