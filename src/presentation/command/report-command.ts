import { Command } from "commander";
import type { GenerateReport } from "../../application/usecase/generate-report.js";
import type { Renderer } from "../renderer/renderer.js";

export function createReportCommand(generateReport: GenerateReport, renderer: Renderer): Command {
  return new Command("report")
    .description("Generate a comprehensive financial report across all available data")
    .action(() => {
      const result = generateReport.execute();
      console.log(renderer.render(result));
    });
}
