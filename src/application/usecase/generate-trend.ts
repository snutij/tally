import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import { InvalidMonth, InvalidMonthRange } from "../../domain/error/index.js";
import { type TrendReportDto, toTrendReportDto } from "../dto/trend-report-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { computeMonthlyReport } from "../../domain/service/compute-monthly-report.js";
import { computeTrendReport } from "../../domain/service/compute-trend-report.js";

function monthsInRange(
  start: Temporal.PlainYearMonth,
  end: Temporal.PlainYearMonth,
): Temporal.PlainYearMonth[] {
  const result: Temporal.PlainYearMonth[] = [];
  let current = start;
  while (Temporal.PlainYearMonth.compare(current, end) <= 0) {
    result.push(current);
    current = current.add({ months: 1 });
  }
  return result;
}

export class GenerateTrend {
  private readonly txnRepository: TransactionRepository;
  private readonly registry: CategoryRegistry;

  constructor(txnRepository: TransactionRepository, registry: CategoryRegistry) {
    this.txnRepository = txnRepository;
    this.registry = registry;
  }

  execute(
    startStr: string,
    endStr: string,
    targets: SpendingTargets = DEFAULT_SPENDING_TARGETS,
  ): TrendReportDto {
    let start: Temporal.PlainYearMonth;
    let end: Temporal.PlainYearMonth;
    try {
      start = Temporal.PlainYearMonth.from(startStr);
      end = Temporal.PlainYearMonth.from(endStr);
    } catch {
      throw new InvalidMonth(startStr);
    }
    if (Temporal.PlainYearMonth.compare(start, end) > 0) {
      throw new InvalidMonthRange(startStr, endStr);
    }
    const categoryMap = this.registry.categoryToGroupMap();
    const monthlyReports = monthsInRange(start, end).map((month) => {
      const transactions = this.txnRepository.findByMonth(month);
      return computeMonthlyReport(month, targets, transactions, categoryMap);
    });
    const trendReport = computeTrendReport({ end, start }, monthlyReports);
    return toTrendReportDto(trendReport);
  }
}
