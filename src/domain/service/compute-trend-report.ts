import type {
  GroupOvershootFrequency,
  MonthOverMonthDelta,
  MonthRange,
  SavingsRateEntry,
  TrendReport,
} from "../read-model/trend-report.js";
import type { GroupSummary, MonthlyReport } from "../read-model/monthly-report.js";
import { EXPENSE_GROUPS } from "../value-object/category-group.js";

function indexGroups(report: MonthlyReport): Record<string, GroupSummary> {
  return Object.fromEntries(report.groups.map((grp) => [grp.group, grp]));
}

function computeSavingsRateSeries(months: MonthlyReport[]): SavingsRateEntry[] {
  return months.map((report) => ({
    month: report.month,
    rate: report.kpis.savingsRate,
  }));
}

function computeGroupOvershootFrequency(months: MonthlyReport[]): GroupOvershootFrequency[] {
  const totalMonths = months.length;
  const indices = months.map((report) => indexGroups(report));
  return EXPENSE_GROUPS.map((group) => {
    const count = indices.filter((index) => (index[group]?.delta.cents ?? 0) < 0).length;
    return { count, group, totalMonths };
  });
}

function computeMonthOverMonthDeltas(months: MonthlyReport[]): MonthOverMonthDelta[] {
  return months.slice(1).map((curr, idx) => {
    const prev = months[idx] as MonthlyReport;
    const prevIndex = indexGroups(prev);
    const currIndex = indexGroups(curr);
    const groupDeltas = EXPENSE_GROUPS.map((group) => ({
      delta: currIndex[group].actual.subtract(prevIndex[group].actual),
      group,
    }));
    return {
      groupDeltas,
      month: curr.month,
      netDelta: curr.net.subtract(prev.net),
    };
  });
}

export function computeTrendReport(range: MonthRange, months: MonthlyReport[]): TrendReport {
  return {
    groupOvershootFrequency: computeGroupOvershootFrequency(months),
    monthOverMonthDeltas: computeMonthOverMonthDeltas(months),
    months,
    range,
    savingsRateSeries: computeSavingsRateSeries(months),
  };
}
