import { Command } from "commander";
import { DEFAULT_SPENDING_TARGETS } from "../../application/config.js";
import type { GenerateReport } from "../../application/usecase/generate-report.js";
import type { Renderer } from "../renderer/renderer.js";

interface ReportOptions {
  needs?: number;
  wants?: number;
  invest?: number;
}

export function createReportCommand(generateReport: GenerateReport, renderer: Renderer): Command {
  return new Command("report")
    .description("Generate a monthly spending report")
    .argument("<month>", "Month in YYYY-MM format")
    .option("--needs <pct>", "Percentage target for Needs (0-100)", Number.parseInt)
    .option("--wants <pct>", "Percentage target for Wants (0-100)", Number.parseInt)
    .option("--invest <pct>", "Percentage target for Investments (0-100)", Number.parseInt)
    .action((monthStr: string, opts: ReportOptions) => {
      const hasAny =
        opts.needs !== undefined || opts.wants !== undefined || opts.invest !== undefined;

      let targets = DEFAULT_SPENDING_TARGETS;

      if (hasAny) {
        const { needs, wants, invest } = opts;
        if (needs === undefined || wants === undefined || invest === undefined) {
          console.error("All three flags (--needs, --wants, --invest) must be provided together.");
          process.exitCode = 1;
          return;
        }
        const sum = needs + wants + invest;
        if (sum !== 100) {
          console.error(`Percentages must sum to 100 (got ${sum}).`);
          process.exitCode = 1;
          return;
        }
        targets = { invest, needs, wants };
      }

      const result = generateReport.execute(monthStr, targets);
      console.log(renderer.render(result));
    });
}
