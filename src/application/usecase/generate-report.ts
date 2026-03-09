import { MonthlyReport } from "../../domain/entity/monthly-report.js";
import type { Month } from "../../domain/value-object/month.js";
import { Budget } from "../../domain/entity/budget.js";
import type { BudgetRepository } from "../gateway/budget-repository.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class GenerateReport {
  constructor(
    private budgetRepo: BudgetRepository,
    private txnRepo: TransactionRepository,
  ) {}

  execute(month: Month): MonthlyReport {
    const budget = this.budgetRepo.findByMonth(month);
    if (!budget) {
      return MonthlyReport.compute(new Budget(month, []), []);
    }

    const transactions = this.txnRepo.findByMonth(month);
    return MonthlyReport.compute(budget, transactions);
  }
}
