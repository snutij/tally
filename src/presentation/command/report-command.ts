import { Command } from "commander";
import type { GenerateReport } from "../../application/usecase/generate-report.js";
import { Month } from "../../domain/value-object/month.js";
import type { Renderer } from "../renderer/renderer.js";

export function createReportCommand(
  generateReport: GenerateReport,
  renderer: Renderer,
): Command {
  return new Command("report")
    .description("Generate a monthly budget vs actual report")
    .argument("<month>", "Month in YYYY-MM format")
    .action((monthStr: string) => {
      const month = Month.from(monthStr);
      const result = generateReport.execute(month);
      console.log(renderer.render(result));
    });
}
