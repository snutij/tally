import { Command } from "commander";
import type { GenerateReport } from "../../application/usecase/generate-report.js";
import type { Renderer } from "../renderer/renderer.js";
import { resolveSpendingTargets } from "./spending-targets-option.js";

interface ReportOptions {
  invest?: number;
  needs?: number;
  wants?: number;
}

export function createReportCommand(generateReport: GenerateReport, renderer: Renderer): Command {
  return new Command("report")
    .description("Generate a monthly spending report")
    .argument("<month>", "Month in YYYY-MM format")
    .option("--needs <pct>", "Percentage target for Needs (0-100)", Number.parseInt)
    .option("--wants <pct>", "Percentage target for Wants (0-100)", Number.parseInt)
    .option("--invest <pct>", "Percentage target for Investments (0-100)", Number.parseInt)
    .action((monthStr: string, opts: ReportOptions) => {
      const targets = resolveSpendingTargets(opts);
      if (targets === undefined) {
        return;
      }
      const result = generateReport.execute(monthStr, targets);
      console.log(renderer.render(result));
    });
}
