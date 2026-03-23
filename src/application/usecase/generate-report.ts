import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import { type MonthlyReportDto, toMonthlyReportDto } from "../dto/report-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { InvalidMonth } from "../../domain/error/index.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { computeMonthlyReport } from "../../domain/service/compute-monthly-report.js";

export class GenerateReport {
  private readonly txnRepository: TransactionRepository;
  private readonly registry: CategoryRegistry;

  constructor(txnRepository: TransactionRepository, registry: CategoryRegistry) {
    this.txnRepository = txnRepository;
    this.registry = registry;
  }

  execute(monthStr: string, targets: SpendingTargets = DEFAULT_SPENDING_TARGETS): MonthlyReportDto {
    let month: Temporal.PlainYearMonth;
    try {
      month = Temporal.PlainYearMonth.from(monthStr);
    } catch {
      throw new InvalidMonth(monthStr);
    }
    const transactions = this.txnRepository.findByMonth(month);
    const report = computeMonthlyReport(
      month,
      targets,
      transactions,
      this.registry.categoryToGroupMap(),
    );
    return toMonthlyReportDto(report);
  }

  executeAll(targets: SpendingTargets = DEFAULT_SPENDING_TARGETS): MonthlyReportDto[] {
    const categoryMap = this.registry.categoryToGroupMap();
    return this.txnRepository.listMonths().map((month) => {
      const transactions = this.txnRepository.findByMonth(month);
      const report = computeMonthlyReport(month, targets, transactions, categoryMap);
      return toMonthlyReportDto(report);
    });
  }
}
