import type { CategoryRule } from "../../src/domain/entity/category-rule.js";
import type { Month } from "../../src/domain/value-object/month.js";
import { RuleBook } from "../../src/domain/aggregate/rule-book.js";
import type { RuleBookRepository } from "../../src/application/port/rule-book-repository.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionId } from "../../src/domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../../src/application/port/transaction-repository.js";

export class InMemoryRuleBookRepository implements RuleBookRepository {
  private rules: CategoryRule[] = [];

  load(): RuleBook {
    return new RuleBook([...this.rules]);
  }

  save(ruleBook: RuleBook): void {
    this.rules = [...ruleBook.allRules()];
  }

  /** Test helper: seed a rule directly, bypassing RuleBook.addRule() duplicate check. */
  seed(rule: CategoryRule): void {
    this.rules.push(rule);
  }

  /** Test helper: find a rule by pattern for assertions. */
  findByPattern(pattern: string): CategoryRule | undefined {
    return this.rules.find((rule) => rule.pattern === pattern);
  }

  /** Test helper: return all rules for assertions. */
  allRules(): readonly CategoryRule[] {
    return this.rules;
  }
}

export class InMemoryTransactionRepository implements TransactionRepository {
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
