import type { CategoryRule } from "../../src/domain/entity/category-rule.js";
import type { CategoryRuleGateway } from "../../src/application/gateway/category-rule-gateway.js";
import type { Month } from "../../src/domain/value-object/month.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionGateway } from "../../src/application/gateway/transaction-gateway.js";
import type { TransactionId } from "../../src/domain/value-object/transaction-id.js";

export class InMemoryCategoryRuleGateway implements CategoryRuleGateway {
  private readonly store = new Map<string, CategoryRule>();

  save(rule: CategoryRule): void {
    this.store.set(rule.pattern, rule);
  }

  findAll(): CategoryRule[] {
    return [...this.store.values()];
  }

  findByPattern(pattern: string): CategoryRule | undefined {
    return this.store.get(pattern);
  }

  removeByPattern(pattern: string): void {
    this.store.delete(pattern);
  }
}

export class InMemoryTransactionGateway implements TransactionGateway {
  readonly saved: Transaction[] = [];

  saveAll(transactions: Transaction[]): void {
    this.saved.push(...transactions);
  }

  findByIds(ids: TransactionId[]): Transaction[] {
    const idSet = new Set<string>(ids);
    return this.saved.filter((txn) => idSet.has(txn.id));
  }

  findByMonth(month: Month): Transaction[] {
    const prefix = month.value;
    return this.saved.filter((txn) => txn.date.toString().startsWith(prefix));
  }
}
