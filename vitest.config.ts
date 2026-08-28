import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
      // Floor slightly below current levels so regressions fail CI while
      // new untested files don't immediately break the gate.
      thresholds: {
        lines: 38,
        functions: 40,
        branches: 35,
        statements: 38,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
