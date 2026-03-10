import { Budget } from "../../domain/entity/budget.js";
import { MonthlyReport } from "../../domain/entity/monthly-report.js";
import type { Renderer } from "./renderer.js";

export class JsonRenderer implements Renderer {
  render(data: unknown): string {
    return JSON.stringify(this.serialize(data), null, 2);
  }

  private serialize(data: unknown): unknown {
    if (data instanceof Budget) {
      return this.serializeBudget(data);
    }
    if (data instanceof MonthlyReport) {
      return this.serializeReport(data);
    }
    return data;
  }

  private serializeBudget(budget: Budget): Record<string, unknown> {
    return {
      lines: budget.lines.map((line) => ({
        amount: line.amount,
        category: line.category,
      })),
      month: budget.month,
      total: budget.total(),
    };
  }

  private serializeReport(report: MonthlyReport): Record<string, unknown> {
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
