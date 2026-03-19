import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import { type TrendReportDto, toTrendReportDto } from "../dto/trend-report-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { MonthRange } from "../../domain/value-object/month-range.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { computeMonthlyReport } from "../../domain/service/compute-monthly-report.js";
import { computeTrendReport } from "../../domain/service/compute-trend-report.js";

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
    const range = MonthRange.from(startStr, endStr);
    const categoryMap = this.registry.categoryToGroupMap();
    const monthlyReports = range.months().map((month) => {
      const transactions = this.txnRepository.findByMonth(month);
      return computeMonthlyReport(month, targets, transactions, categoryMap);
    });
    const trendReport = computeTrendReport(range, monthlyReports);
    return toTrendReportDto(trendReport);
  }
}
