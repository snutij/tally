import {
  DEFAULT_SPENDING_TARGETS,
  type SpendingTargets,
} from "../../domain/config/spending-targets.js";
import type { Month } from "../../domain/value-object/month.js";
import { MonthlyReport } from "../../domain/entity/monthly-report.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class GenerateReport {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  execute(month: Month, targets: SpendingTargets = DEFAULT_SPENDING_TARGETS): MonthlyReport {
    const transactions = this.txnRepo.findByMonth(month);
    return MonthlyReport.compute(month, targets, transactions);
  }
}
