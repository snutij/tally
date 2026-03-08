import { Budget } from "../../domain/entity/budget.js";
import { MonthlyReport } from "../../domain/entity/monthly-report.js";
import { Renderer } from "./renderer.js";

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
      month: budget.month.value,
      lines: budget.lines.map((line) => ({
        category: {
          id: line.category.id,
          name: line.category.name,
          group: line.category.group,
        },
        amount: line.amount.toEuros(),
      })),
      total: budget.total().toEuros(),
    };
  }

  private serializeReport(report: MonthlyReport) {
    return {
      month: report.month.value,
      groups: report.groups.map((g) => ({
        group: g.group,
        budgeted: g.budgeted.toEuros(),
        actual: g.actual.toEuros(),
        delta: g.delta.toEuros(),
        budgetedPercent: g.budgetedPercent,
        actualPercent: g.actualPercent,
      })),
      totalBudgeted: report.totalBudgeted.toEuros(),
      totalActual: report.totalActual.toEuros(),
      totalDelta: report.totalDelta.toEuros(),
    };
  }
}
