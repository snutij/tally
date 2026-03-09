import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/application/gateway/*.ts",
        "src/domain/entity/category.ts",
        "src/domain/entity/transaction.ts",
        "src/presentation/renderer/renderer.ts",
        "src/presentation/index.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
