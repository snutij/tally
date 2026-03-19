import type {
  GroupOvershootFrequency,
  MonthOverMonthDelta,
  SavingsRateEntry,
  TrendReport,
} from "../read-model/trend-report.js";
import { CategoryGroup } from "../value-object/category-group.js";
import type { MonthRange } from "../value-object/month-range.js";
import type { MonthlyReport } from "../read-model/monthly-report.js";

const EXPENSE_GROUPS: CategoryGroup[] = [
  CategoryGroup.NEEDS,
  CategoryGroup.WANTS,
  CategoryGroup.INVESTMENTS,
];

function computeSavingsRateSeries(months: MonthlyReport[]): SavingsRateEntry[] {
  return months.map((report) => ({
    month: report.month,
    rate: report.kpis.savingsRate,
  }));
}

function computeGroupOvershootFrequency(months: MonthlyReport[]): GroupOvershootFrequency[] {
  return EXPENSE_GROUPS.map((group) => {
    const count = months.filter((report) => {
      const summary = report.groups.find((grp) => grp.group === group);
      return summary !== undefined && summary.delta.cents < 0;
    }).length;
    return { count, group, totalMonths: months.length };
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
