import { Budget } from "../../domain/entity/budget.js";
import { MonthlyReport } from "../../domain/entity/monthly-report.js";
import type { Renderer } from "./renderer.js";

export class JsonRenderer implements Renderer {
  // eslint-disable-next-line class-methods-use-this -- implements Renderer interface
  render(data: unknown): string {
    return JSON.stringify(JsonRenderer.serialize(data), undefined, 2);
  }

  private static serialize(data: unknown): unknown {
    if (data instanceof Budget) {
      return JsonRenderer.serializeBudget(data);
    }
    if (data instanceof MonthlyReport) {
      return JsonRenderer.serializeReport(data);
    }
    return data;
  }

  private static serializeBudget(budget: Budget): Record<string, unknown> {
    return {
      lines: budget.lines.map((line) => ({
        amount: line.amount,
        category: line.category,
      })),
      month: budget.month,
      total: budget.total(),
    };
  }

  private static serializeReport(report: MonthlyReport): Record<string, unknown> {
    return {
      categories: report.categories,
      groups: report.groups,
      kpis: report.kpis,
      month: report.month,
      net: report.net,
      totalExpenseActual: report.totalExpenseActual,
      totalExpenseBudgeted: report.totalExpenseBudgeted,
      totalIncomeActual: report.totalIncomeActual,
      totalIncomeBudgeted: report.totalIncomeBudgeted,
      transactionCount: report.transactionCount,
      uncategorized: report.uncategorized,
    };
  }
}
