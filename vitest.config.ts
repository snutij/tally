import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        // Composition root: side effects (fs, db, process.exit), Commander + Inquirer wiring — no unit test value
        "src/presentation/index.ts",
        // Interactive I/O via @inquirer/select — pure logic (validateFields) is extracted and tested separately
        "src/presentation/prompt/column-mapping-prompt.ts",
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
