import type {
  GroupOvershootFrequency,
  MonthOverMonthDelta,
  MonthRange,
  SavingsRateEntry,
  TrendReport,
} from "../read-model/trend-report.js";
import { EXPENSE_GROUPS } from "../value-object/category-group.js";
import type { MonthlyReport } from "../read-model/monthly-report.js";

function computeSavingsRateSeries(months: MonthlyReport[]): SavingsRateEntry[] {
  return months.map((report) => ({
    month: report.month,
    rate: report.kpis.savingsRate,
  }));
}

function computeGroupOvershootFrequency(months: MonthlyReport[]): GroupOvershootFrequency[] {
  const totalMonths = months.length;
  return EXPENSE_GROUPS.map((group) => {
    const count = months.filter((report) => {
      const summary = report.groups.find((grp) => grp.group === group);
      return summary !== undefined && summary.delta.cents < 0;
    }).length;
    return { count, group, totalMonths };
  });
}

function computeMonthOverMonthDeltas(months: MonthlyReport[]): MonthOverMonthDelta[] {
  return months.slice(1).map((curr, idx) => {
    const prev = months[idx] as MonthlyReport;
    const groupDeltas = EXPENSE_GROUPS.map((group) => {
      const prevActual = prev.groups.find((grp) => grp.group === group)?.actual;
      const currActual = curr.groups.find((grp) => grp.group === group)?.actual;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- EXPENSE_GROUPS always present in MonthlyReport.groups
      const delta = currActual!.subtract(prevActual!);
      return { delta, group };
    });
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
