import type {
  GroupOvershootFrequency,
  MonthOverMonthDelta,
  SavingsRateEntry,
  TrendReport,
} from "../../domain/read-model/trend-report.js";
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
    readonly investments: number | null;
    readonly needs: number | null;
    readonly wants: number | null;
  };
  readonly largestExpenses: LargestExpenseEntryDto[];
  readonly savingsRate: number | null;
  readonly topSpendingCategories: TopSpendingEntryDto[];
  readonly uncategorizedRatio: number | null;
}

export interface MonthlyReportDto {
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
    date: entry.date.toString(),
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
    groups: report.groups.map((grp) => toGroupSummaryDto(grp)),
    kpis: toReportKpisDto(report.kpis),
    month: report.month.toString(),
    net: report.net.toEuros(),
    totalExpenseActual: report.totalExpenseActual.toEuros(),
    totalExpenseTarget: report.totalExpenseTarget.toEuros(),
    totalIncomeActual: report.totalIncomeActual.toEuros(),
    transactionCount: report.transactionCount,
    uncategorized: report.uncategorized.toEuros(),
  };
}

// ── Trend Analytics ──────────────────────────────────────

export interface SavingsRateEntryDto {
  readonly month: string;
  readonly rate: number | null;
}

export interface GroupOvershootFrequencyDto {
  readonly group: string;
  readonly count: number;
  readonly totalMonths: number;
}

export interface GroupDeltaDto {
  readonly group: string;
  readonly delta: number;
}

export interface MonthOverMonthDeltaDto {
  readonly month: string;
  readonly netDelta: number;
  readonly groupDeltas: GroupDeltaDto[];
}

export interface TrendAnalyticsDto {
  readonly savingsRateSeries: SavingsRateEntryDto[];
  readonly groupOvershootFrequency: GroupOvershootFrequencyDto[];
  readonly monthOverMonthDeltas: MonthOverMonthDeltaDto[];
}

// ── Report DTO ───────────────────────────────────────────

export interface ReportDto {
  readonly _type: "ReportDto";
  readonly range: { readonly start: string; readonly end: string } | null;
  readonly months: MonthlyReportDto[];
  readonly trend: TrendAnalyticsDto | null;
}

export function isReportDto(data: unknown): data is ReportDto {
  return (
    typeof data === "object" && data !== null && (data as { _type?: unknown })._type === "ReportDto"
  );
}

function toSavingsRateEntryDto(entry: SavingsRateEntry): SavingsRateEntryDto {
  return { month: entry.month.toString(), rate: entry.rate };
}

function toGroupOvershootFrequencyDto(entry: GroupOvershootFrequency): GroupOvershootFrequencyDto {
  return { count: entry.count, group: entry.group, totalMonths: entry.totalMonths };
}

function toMonthOverMonthDeltaDto(delta: MonthOverMonthDelta): MonthOverMonthDeltaDto {
  return {
    groupDeltas: delta.groupDeltas.map((gd) => ({
      delta: gd.delta.toEuros(),
      group: gd.group,
    })),
    month: delta.month.toString(),
    netDelta: delta.netDelta.toEuros(),
  };
}

export function toTrendAnalyticsDto(report: TrendReport): TrendAnalyticsDto {
  return {
    groupOvershootFrequency: report.groupOvershootFrequency.map(toGroupOvershootFrequencyDto),
    monthOverMonthDeltas: report.monthOverMonthDeltas.map(toMonthOverMonthDeltaDto),
    savingsRateSeries: report.savingsRateSeries.map(toSavingsRateEntryDto),
  };
}

export function toReportDto(
  months: Temporal.PlainYearMonth[],
  trendReport: TrendReport | null,
  monthDtos: MonthlyReportDto[],
): ReportDto {
  const range =
    months.length > 0
      ? {
          end: (months.at(-1) as Temporal.PlainYearMonth).toString(),
          start: (months.at(0) as Temporal.PlainYearMonth).toString(),
        }
      : null;

  return {
    _type: "ReportDto",
    months: monthDtos,
    range,
    trend: trendReport === null ? null : toTrendAnalyticsDto(trendReport),
  };
}
