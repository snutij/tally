import type { CategoryGroup } from "../value-object/category-group.js";
import type { Money } from "../value-object/money.js";
import type { Month } from "../value-object/month.js";
import type { MonthRange } from "../value-object/month-range.js";
import type { MonthlyReport } from "./monthly-report.js";

export interface SavingsRateEntry {
  readonly month: Month;
  // eslint-disable-next-line unicorn/no-null -- mirrors MonthlyReport.kpis.savingsRate nullability
  readonly rate: number | null;
}

export interface GroupOvershootFrequency {
  readonly group: CategoryGroup;
  readonly count: number;
  readonly totalMonths: number;
}

export interface GroupDelta {
  readonly group: CategoryGroup;
  readonly delta: Money;
}

export interface MonthOverMonthDelta {
  readonly month: Month;
  readonly netDelta: Money;
  readonly groupDeltas: GroupDelta[];
}

export interface TrendReport {
  readonly range: MonthRange;
  readonly months: MonthlyReport[];
  readonly savingsRateSeries: SavingsRateEntry[];
  readonly groupOvershootFrequency: GroupOvershootFrequency[];
  readonly monthOverMonthDeltas: MonthOverMonthDelta[];
}
