import type {
  GroupOvershootFrequency,
  MonthOverMonthDelta,
  SavingsRateEntry,
  TrendReport,
} from "../../domain/read-model/trend-report.js";
import { type MonthlyReportDto, toMonthlyReportDto } from "./report-dto.js";

export interface SavingsRateEntryDto {
  readonly month: string;
  // eslint-disable-next-line unicorn/no-null -- mirrors domain model null for zero-income months
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

export interface TrendReportDto {
  readonly _type: "TrendReportDto";
  readonly start: string;
  readonly end: string;
  readonly months: MonthlyReportDto[];
  readonly savingsRateSeries: SavingsRateEntryDto[];
  readonly groupOvershootFrequency: GroupOvershootFrequencyDto[];
  readonly monthOverMonthDeltas: MonthOverMonthDeltaDto[];
}

export function isTrendReportDto(data: unknown): data is TrendReportDto {
  return (
    typeof data === "object" &&
    // eslint-disable-next-line unicorn/no-null -- standard null check for unknown data
    data !== null &&
    (data as { _type?: unknown })._type === "TrendReportDto"
  );
}

function toSavingsRateEntryDto(entry: SavingsRateEntry): SavingsRateEntryDto {
  return { month: entry.month.value, rate: entry.rate };
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
    month: delta.month.value,
    netDelta: delta.netDelta.toEuros(),
  };
}

export function toTrendReportDto(report: TrendReport): TrendReportDto {
  return {
    _type: "TrendReportDto",
    end: report.range.end.value,
    groupOvershootFrequency: report.groupOvershootFrequency.map(toGroupOvershootFrequencyDto),
    monthOverMonthDeltas: report.monthOverMonthDeltas.map(toMonthOverMonthDeltaDto),
    months: report.months.map(toMonthlyReportDto),
    savingsRateSeries: report.savingsRateSeries.map(toSavingsRateEntryDto),
    start: report.range.start.value,
  };
}
