import type {
  GroupOvershootFrequency,
  MonthOverMonthDelta,
  SavingsRateEntry,
  TrendReport,
} from "../../domain/read-model/trend-report.js";
import type { MonthlyReportDto } from "./report-dto.js";

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

export interface UnifiedReportDto {
  readonly _type: "UnifiedReportDto";
  readonly range: { readonly start: string; readonly end: string } | null;
  readonly months: MonthlyReportDto[];
  readonly trend: TrendAnalyticsDto | null;
}

export function isUnifiedReportDto(data: unknown): data is UnifiedReportDto {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { _type?: unknown })._type === "UnifiedReportDto"
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

export function toUnifiedReportDto(
  months: Temporal.PlainYearMonth[],
  trendReport: TrendReport | null,
  monthDtos: MonthlyReportDto[],
): UnifiedReportDto {
  const range =
    months.length > 0
      ? {
          end: (months.at(-1) as Temporal.PlainYearMonth).toString(),
          start: (months.at(0) as Temporal.PlainYearMonth).toString(),
        }
      : null;

  return {
    _type: "UnifiedReportDto",
    months: monthDtos,
    range,
    trend: trendReport === null ? null : toTrendAnalyticsDto(trendReport),
  };
}
