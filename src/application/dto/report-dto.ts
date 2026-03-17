import type {
  GroupSummary,
  LargestExpenseEntry,
  MonthlyReport,
  ReportKpis,
  TopSpendingEntry,
} from "../../domain/read-model/monthly-report.js";

export interface GroupSummaryDto {
  readonly actual: number;
  readonly actualPercent: number;
  readonly budgeted: number;
  readonly budgetedPercent: number;
  readonly delta: number;
  readonly group: string;
}

export interface TopSpendingEntryDto {
  readonly actual: number;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly group: string;
}

export interface LargestExpenseEntryDto {
  readonly amount: number;
  readonly date: string;
  readonly id: string;
  readonly label: string;
}

export interface ReportKpisDto {
  readonly dailyAverageSpending: number;
  readonly fiftyThirtyTwenty: {
    // eslint-disable-next-line unicorn/no-null -- mirrors domain model nullable KPIs
    readonly investments: number | null;
    // eslint-disable-next-line unicorn/no-null -- mirrors domain model nullable KPIs
    readonly needs: number | null;
    // eslint-disable-next-line unicorn/no-null -- mirrors domain model nullable KPIs
    readonly wants: number | null;
  };
  readonly largestExpenses: LargestExpenseEntryDto[];
  // eslint-disable-next-line unicorn/no-null -- mirrors domain model nullable KPIs
  readonly savingsRate: number | null;
  readonly topSpendingCategories: TopSpendingEntryDto[];
  // eslint-disable-next-line unicorn/no-null -- mirrors domain model nullable KPIs
  readonly uncategorizedRatio: number | null;
}

export interface MonthlyReportDto {
  readonly _type: "MonthlyReportDto";
  readonly groups: GroupSummaryDto[];
  readonly kpis: ReportKpisDto;
  readonly month: string;
  readonly net: number;
  readonly totalExpenseActual: number;
  readonly totalExpenseTarget: number;
  readonly totalIncomeActual: number;
  readonly transactionCount: number;
  readonly uncategorized: number;
}

export function isMonthlyReportDto(data: unknown): data is MonthlyReportDto {
  return (
    typeof data === "object" &&
    // eslint-disable-next-line unicorn/no-null -- standard null check for unknown data
    data !== null &&
    (data as { _type?: unknown })._type === "MonthlyReportDto"
  );
}

function toGroupSummaryDto(grp: GroupSummary): GroupSummaryDto {
  return {
    actual: grp.actual.toEuros(),
    actualPercent: grp.actualPercent,
    budgeted: grp.budgeted.toEuros(),
    budgetedPercent: grp.budgetedPercent,
    delta: grp.delta.toEuros(),
    group: grp.group,
  };
}

function toTopSpendingEntryDto(entry: TopSpendingEntry): TopSpendingEntryDto {
  return {
    actual: entry.actual.toEuros(),
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    group: entry.group,
  };
}

function toLargestExpenseEntryDto(entry: LargestExpenseEntry): LargestExpenseEntryDto {
  return {
    amount: entry.amount.toEuros(),
    date: entry.date.value,
    id: entry.id,
    label: entry.label,
  };
}

function toReportKpisDto(kpis: ReportKpis): ReportKpisDto {
  return {
    dailyAverageSpending: kpis.dailyAverageSpending.toEuros(),
    fiftyThirtyTwenty: kpis.fiftyThirtyTwenty,
    largestExpenses: kpis.largestExpenses.map((entry) => toLargestExpenseEntryDto(entry)),
    savingsRate: kpis.savingsRate,
    topSpendingCategories: kpis.topSpendingCategories.map((entry) => toTopSpendingEntryDto(entry)),
    uncategorizedRatio: kpis.uncategorizedRatio,
  };
}

export function toMonthlyReportDto(report: MonthlyReport): MonthlyReportDto {
  return {
    _type: "MonthlyReportDto",
    groups: report.groups.map((grp) => toGroupSummaryDto(grp)),
    kpis: toReportKpisDto(report.kpis),
    month: report.month.value,
    net: report.net.toEuros(),
    totalExpenseActual: report.totalExpenseActual.toEuros(),
    totalExpenseTarget: report.totalExpenseTarget.toEuros(),
    totalIncomeActual: report.totalIncomeActual.toEuros(),
    transactionCount: report.transactionCount,
    uncategorized: report.uncategorized.toEuros(),
  };
}
