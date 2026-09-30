import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Typed linting only applies to TS sources — the plain-JS config files
    // are not part of any tsconfig project.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    // Typed linting lets rules like no-floating-promises understand Promise
    // types. projectService is faster than listing tsconfig projects and
    // covers tests and scripts too.
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // AUDIT-015 found a real production bug of exactly this class: an
      // unawaited async session verifier made every customer cancel 401.
      // A promise must be awaited, voided (intentional fire-and-forget),
      // or .catch()ed. logActivity is documented fire-and-forget — it parks
      // its write on waitUntil and swallows its own errors — so its call
      // sites are exempt via allowForKnownSafePromises.
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            { from: "file", name: "logActivity" },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test coverage report
    "coverage/**",
    // External AI tooling copied into the repo (not application code)
    ".agents/**",
    ".claude/**",
    ".mimocode/**",
  ]),
]);

export default eslintConfig;
