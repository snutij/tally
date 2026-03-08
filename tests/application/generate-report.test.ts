import { describe, it, expect, beforeEach } from "vitest";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { BudgetRepository } from "../../src/application/gateway/budget-repository.js";
import { TransactionRepository } from "../../src/application/gateway/transaction-repository.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";

class InMemoryBudgetRepository implements BudgetRepository {
  private store = new Map<string, Budget>();
  save(budget: Budget): void {
    this.store.set(budget.month.value, budget);
  }
  findByMonth(month: Month): Budget | null {
    return this.store.get(month.value) ?? null;
  }
  exists(month: Month): boolean {
    return this.store.has(month.value);
  }
}

class InMemoryTransactionRepository implements TransactionRepository {
  private store: Transaction[] = [];
  saveAll(transactions: Transaction[]): void {
    this.store.push(...transactions);
  }
  findByMonth(_month: Month): Transaction[] {
    return this.store;
  }
}

describe("GenerateReport", () => {
  let budgetRepo: InMemoryBudgetRepository;
  let txnRepo: InMemoryTransactionRepository;
  let useCase: GenerateReport;

  beforeEach(() => {
    budgetRepo = new InMemoryBudgetRepository();
    txnRepo = new InMemoryTransactionRepository();
    useCase = new GenerateReport(budgetRepo, txnRepo);
  });

  it("generates report with budget and transactions", () => {
    const month = Month.from("2026-03");
    const budget = new Budget(month, [
      {
        category: { id: "rent", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
    ]);
    budgetRepo.save(budget);
    txnRepo.saveAll([
      {
        id: "1",
        date: new Date("2026-03-01"),
        label: "Rent",
        amount: Money.fromEuros(-800),
        categoryId: "rent",
        sourceBank: "test",
      },
    ]);

    const report = useCase.execute(month);
    expect(report.totalExpenseBudgeted.cents).toBe(80000);
    expect(report.totalExpenseActual.cents).toBe(80000);
  });

  it("returns empty report when no budget exists", () => {
    const month = Month.from("2026-03");
    const report = useCase.execute(month);
    expect(report.totalExpenseBudgeted.cents).toBe(0);
    expect(report.totalExpenseActual.cents).toBe(0);
  });
});
