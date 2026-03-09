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

  private serializeBudget(budget: Budget) {
    return {
      month: budget.month,
      lines: budget.lines.map((line) => ({
        category: line.category,
        amount: line.amount,
      })),
      total: budget.total(),
    };
  }

  private serializeReport(report: MonthlyReport) {
    return {
      month: report.month,
      groups: report.groups,
      categories: report.categories,
      uncategorized: report.uncategorized,
      totalIncomeBudgeted: report.totalIncomeBudgeted,
      totalIncomeActual: report.totalIncomeActual,
      totalExpenseBudgeted: report.totalExpenseBudgeted,
      totalExpenseActual: report.totalExpenseActual,
      net: report.net,
      transactionCount: report.transactionCount,
      kpis: report.kpis,
    };
  }
}
