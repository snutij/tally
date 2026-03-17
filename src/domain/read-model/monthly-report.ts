import type { CategoryGroup } from "../value-object/category-group.js";
import type { DateOnly } from "../value-object/date-only.js";
import type { Money } from "../value-object/money.js";
import type { Month } from "../value-object/month.js";

export interface GroupSummary {
  readonly group: CategoryGroup;
  readonly budgeted: Money;
  readonly actual: Money;
  readonly delta: Money;
  /** For expense groups: the target percentage (50/30/20). For income: 0. */
  readonly budgetedPercent: number;
  readonly actualPercent: number;
}

export interface TopSpendingEntry {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly group: CategoryGroup;
  readonly actual: Money;
}

export interface LargestExpenseEntry {
  readonly id: string;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
}

export interface ReportKpis {
  readonly savingsRate: number | null;
  readonly fiftyThirtyTwenty: {
    readonly needs: number | null;
    readonly wants: number | null;
    readonly investments: number | null;
  };
  readonly topSpendingCategories: TopSpendingEntry[];
  readonly dailyAverageSpending: Money;
  readonly largestExpenses: LargestExpenseEntry[];
  readonly uncategorizedRatio: number | null;
}

export interface MonthlyReport {
  readonly _type: "MonthlyReport";
  readonly groups: GroupSummary[];
  readonly kpis: ReportKpis;
  readonly month: Month;
  readonly net: Money;
  readonly totalExpenseActual: Money;
  readonly totalExpenseTarget: Money;
  readonly totalIncomeActual: Money;
  readonly transactionCount: number;
  readonly uncategorized: Money;
}
