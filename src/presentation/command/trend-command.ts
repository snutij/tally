import { Command } from "commander";
import type { GenerateTrend } from "../../application/usecase/generate-trend.js";
import type { Renderer } from "../renderer/renderer.js";
import { resolveSpendingTargets } from "./spending-targets-option.js";

interface TrendOptions {
  invest?: number;
  needs?: number;
  wants?: number;
}

export function createTrendCommand(generateTrend: GenerateTrend, renderer: Renderer): Command {
  return new Command("trend")
    .description("Analyse spending trends across a date range")
    .argument("<start>", "Start month in YYYY-MM format")
    .argument("<end>", "End month in YYYY-MM format")
    .option("--needs <pct>", "Percentage target for Needs (0-100)", Number.parseInt)
    .option("--wants <pct>", "Percentage target for Wants (0-100)", Number.parseInt)
    .option("--invest <pct>", "Percentage target for Investments (0-100)", Number.parseInt)
    .action((startStr: string, endStr: string, opts: TrendOptions) => {
      const targets = resolveSpendingTargets(opts);
      if (targets === undefined) {
        return;
      }
      const result = generateTrend.execute(startStr, endStr, targets);
      console.log(renderer.render(result));
    });
}
