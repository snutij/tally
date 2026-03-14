import { defineConfig } from "tsdown";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  deps: {
    skipNodeModulesBundle: true,
  },
  entry: ["src/presentation/index.ts"],
  format: "esm",
  outDir: "dist",
  sourcemap: true,
});
