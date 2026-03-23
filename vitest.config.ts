import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        // Composition root: side effects (fs, db, process.exit), Commander + Inquirer wiring — no unit test value
        "src/presentation/index.ts",
        // Interactive I/O via @inquirer/select — pure logic (validateFields) is extracted and tested separately
        "src/presentation/prompt/column-mapping-prompt.ts",
        // ONNX model inference — requires 43 MB model download; cosine similarity logic tested in cosine-similarity.test.ts
        "src/infrastructure/ai/embedding-category-suggester.ts",
        // Interactive I/O via @inquirer/confirm — trivial wrapper
        "src/presentation/prompt/smart-consent-prompt.ts",
        // Commander wiring + interactive consent flow (resolveSuggester) — depends on model/TTY
        "src/presentation/command/import-command.ts",
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
