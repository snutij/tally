import { Command } from "commander";
import type { GenerateUnifiedReport } from "../../application/usecase/generate-unified-report.js";
import type { Renderer } from "../renderer/renderer.js";
import { resolveSpendingTargets } from "./spending-targets-option.js";

interface ReportOptions {
  invest?: number;
  needs?: number;
  wants?: number;
}

export function createReportCommand(
  generateUnifiedReport: GenerateUnifiedReport,
  renderer: Renderer,
): Command {
  return new Command("report")
    .description("Generate a comprehensive financial report across all available data")
    .option("--needs <pct>", "Percentage target for Needs (0-100)", Number.parseInt)
    .option("--wants <pct>", "Percentage target for Wants (0-100)", Number.parseInt)
    .option("--invest <pct>", "Percentage target for Investments (0-100)", Number.parseInt)
    .action((opts: ReportOptions) => {
      const targets = resolveSpendingTargets(opts);
      if (targets === undefined) {
        return;
      }
      const result = generateUnifiedReport.execute(targets);
      console.log(renderer.render(result));
    });
}
