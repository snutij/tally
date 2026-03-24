import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        // Composition root: side effects (fs, db, process.exit), Commander + node-llama-cpp wiring — no unit test value
        "src/presentation/index.ts",
      ],
      include: ["src/**/*.ts"],
      provider: "v8",
      thresholds: {
        branches: 90, // v8 counts ?? fallbacks as branches even when unreachable
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    setupFiles: ["tests/setup.ts"],
  },
});
