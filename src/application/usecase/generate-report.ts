import { DEFAULT_CATEGORIES, buildCategoryMap } from "../../domain/default-categories.js";
import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import { type MonthlyReportDto, toMonthlyReportDto } from "../dto/report-dto.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { computeMonthlyReport } from "../../domain/service/compute-monthly-report.js";

const DEFAULT_CATEGORY_MAP = buildCategoryMap(DEFAULT_CATEGORIES);

export class GenerateReport {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  execute(monthStr: string, targets: SpendingTargets = DEFAULT_SPENDING_TARGETS): MonthlyReportDto {
    const month = Month.from(monthStr);
    const transactions = this.txnRepo.findByMonth(month);
    const report = computeMonthlyReport(month, targets, transactions, DEFAULT_CATEGORY_MAP);
    return toMonthlyReportDto(report);
  }
}
