import { type MonthlyReportDto, isMonthlyReportDto } from "../../application/dto/report-dto.js";
import type { Renderer } from "./renderer.js";

export class JsonRenderer implements Renderer {
  render(data: unknown): string {
    return JSON.stringify(JsonRenderer.serialize(data), undefined, 2);
  }

  private static serialize(data: unknown): unknown {
    if (isMonthlyReportDto(data)) {
      return JsonRenderer.serializeReport(data);
    }
    if (Array.isArray(data)) {
      return data.map((entry) => JsonRenderer.serialize(entry));
    }
    return data;
  }

  private static serializeReport(report: MonthlyReportDto): Record<string, unknown> {
    return {
      groups: report.groups,
      kpis: report.kpis,
      month: report.month,
      net: report.net,
      totalExpenseActual: report.totalExpenseActual,
      totalExpenseTarget: report.totalExpenseTarget,
      totalIncomeActual: report.totalIncomeActual,
      transactionCount: report.transactionCount,
      uncategorized: report.uncategorized,
    };
  }
}
