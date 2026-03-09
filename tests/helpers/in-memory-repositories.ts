import type { BudgetRepository } from "../../src/application/gateway/budget-repository.js";
import type { TransactionRepository } from "../../src/application/gateway/transaction-repository.js";
import type { Budget } from "../../src/domain/entity/budget.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";
import type { Month } from "../../src/domain/value-object/month.js";

export class InMemoryBudgetRepository implements BudgetRepository {
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

export class InMemoryTransactionRepository implements TransactionRepository {
  readonly saved: Transaction[] = [];

  saveAll(transactions: Transaction[]): void {
    this.saved.push(...transactions);
  }

  findByIds(ids: string[]): Transaction[] {
    const idSet = new Set(ids);
    return this.saved.filter((t) => idSet.has(t.id));
  }

  findByMonth(_month: Month): Transaction[] {
    return this.saved;
  }
}
