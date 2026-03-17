import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "src/application/config.ts",
        "src/application/dto/csv-mapping-config.ts",
        "src/application/dto/index.ts",
        "src/application/error.ts",
        "src/application/gateway/*.ts",
        "src/domain/entity/category.ts",
        "src/domain/read-model/monthly-report.ts",
        "src/presentation/prompt/column-mapping-prompt.ts",
        "src/presentation/renderer/renderer.ts",
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
  },
});
