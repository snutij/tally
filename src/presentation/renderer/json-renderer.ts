import { type MonthlyReport, isMonthlyReport } from "../../domain/read-model/monthly-report.js";
import type { Renderer } from "./renderer.js";

export class JsonRenderer implements Renderer {
  // eslint-disable-next-line class-methods-use-this -- implements Renderer interface
  render(data: unknown): string {
    return JSON.stringify(JsonRenderer.serialize(data), undefined, 2);
  }

  private static serialize(data: unknown): unknown {
    if (isMonthlyReport(data)) {
      return JsonRenderer.serializeReport(data);
    }
    return data;
  }

  private static serializeReport(report: MonthlyReport): Record<string, unknown> {
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
