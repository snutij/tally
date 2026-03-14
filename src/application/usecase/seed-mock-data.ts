import { MOCK_BUDGET_AMOUNTS, mockTransactions } from "../../domain/mock-dataset.js";
import { Budget } from "../../domain/entity/budget.js";
import type { BudgetRepository } from "../gateway/budget-repository.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { Money } from "../../domain/value-object/money.js";
import type { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class SeedMockData {
  private txnRepo: TransactionRepository;
  private budgetRepo: BudgetRepository;

  constructor(txnRepo: TransactionRepository, budgetRepo: BudgetRepository) {
    this.txnRepo = txnRepo;
    this.budgetRepo = budgetRepo;
  }

  execute(month: Month): { transactionCount: number; budgetCreated: boolean } {
    const txns = mockTransactions(month.year, month.month);
    this.txnRepo.saveAll(txns);

    let budgetCreated = false;
    if (!this.budgetRepo.exists(month)) {
      const budget = new Budget(
        month,
        DEFAULT_CATEGORIES.map((category) => ({
          amount: Money.fromEuros(MOCK_BUDGET_AMOUNTS[category.id] ?? 0),
          category,
        })),
      );
      this.budgetRepo.save(budget);
      budgetCreated = true;
    }

    return { budgetCreated, transactionCount: txns.length };
  }
}
