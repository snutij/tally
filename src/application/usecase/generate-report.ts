import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import { type ReportDto, toMonthlyReportDto, toReportDto } from "../dto/report-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { computeMonthlyReport } from "../../domain/service/compute-monthly-report.js";
import { computeTrendReport } from "../../domain/service/compute-trend-report.js";

export class GenerateReport {
  private readonly txnRepository: TransactionRepository;
  private readonly registry: CategoryRegistry;

  constructor(txnRepository: TransactionRepository, registry: CategoryRegistry) {
    this.txnRepository = txnRepository;
    this.registry = registry;
  }

  execute(targets: SpendingTargets = DEFAULT_SPENDING_TARGETS): ReportDto {
    const months = this.txnRepository.distinctMonths().toSorted(Temporal.PlainYearMonth.compare);

    if (months.length === 0) {
      return { _type: "ReportDto", months: [], range: null, trend: null };
    }

    const categoryMap = this.registry.categoryToGroupMap();
    const monthlyReports = months.map((month) => {
      const transactions = this.txnRepository.findByMonth(month);
      return computeMonthlyReport(month, targets, transactions, categoryMap);
    });

    const monthDtos = monthlyReports.map((report) => toMonthlyReportDto(report));

    if (monthlyReports.length < 2) {
      return toReportDto(months, null, monthDtos);
    }

    const range = {
      end: months.at(-1) as Temporal.PlainYearMonth,
      start: months.at(0) as Temporal.PlainYearMonth,
    };
    const trendReport = computeTrendReport(range, monthlyReports);
    return toReportDto(months, trendReport, monthDtos);
  }
}
