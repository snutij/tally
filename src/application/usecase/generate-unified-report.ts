import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import { type UnifiedReportDto, toUnifiedReportDto } from "../dto/unified-report-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { computeMonthlyReport } from "../../domain/service/compute-monthly-report.js";
import { computeTrendReport } from "../../domain/service/compute-trend-report.js";
import { toMonthlyReportDto } from "../dto/report-dto.js";

export class GenerateUnifiedReport {
  private readonly txnRepository: TransactionRepository;
  private readonly registry: CategoryRegistry;

  constructor(txnRepository: TransactionRepository, registry: CategoryRegistry) {
    this.txnRepository = txnRepository;
    this.registry = registry;
  }

  execute(targets: SpendingTargets = DEFAULT_SPENDING_TARGETS): UnifiedReportDto {
    const months = this.txnRepository.distinctMonths();

    if (months.length === 0) {
      return { _type: "UnifiedReportDto", months: [], range: null, trend: null };
    }

    const categoryMap = this.registry.categoryToGroupMap();
    const monthlyReports = months.map((month) => {
      const transactions = this.txnRepository.findByMonth(month);
      return computeMonthlyReport(month, targets, transactions, categoryMap);
    });

    const monthDtos = monthlyReports.map((report) => toMonthlyReportDto(report));

    if (monthlyReports.length < 2) {
      return toUnifiedReportDto(months, null, monthDtos);
    }

    const range = {
      end: months.at(-1) as Temporal.PlainYearMonth,
      start: months.at(0) as Temporal.PlainYearMonth,
    };
    const trendReport = computeTrendReport(range, monthlyReports);
    return toUnifiedReportDto(months, trendReport, monthDtos);
  }
}
