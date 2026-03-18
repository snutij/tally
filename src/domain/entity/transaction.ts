import { AggregateRoot } from "../aggregate/aggregate-root.js";
import type { CategoryId } from "../value-object/category-id.js";
import type { CategoryRuleId } from "../value-object/category-rule-id.js";
import type { DateOnly } from "../value-object/date-only.js";
import { DomainError } from "../error/index.js";
import type { Money } from "../value-object/money.js";
import type { TransactionId } from "../value-object/transaction-id.js";
import { createTransactionCategorized } from "../event/transaction-categorized.js";
import { createTransactionImported } from "../event/transaction-imported.js";

export type TransactionSource = "csv" | "mock";

export interface TransactionParams {
  readonly id: TransactionId;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
  readonly categoryId?: CategoryId | undefined;
  readonly source: TransactionSource;
}

export class Transaction extends AggregateRoot {
  readonly id: TransactionId;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
  readonly categoryId: CategoryId | undefined;
  readonly source: TransactionSource;

  private constructor(params: TransactionParams) {
    super();
    this.id = params.id;
    this.date = params.date;
    this.label = params.label;
    this.amount = params.amount;
    this.categoryId = params.categoryId;
    this.source = params.source;
  }

  /** Reconstitution factory — no domain events recorded. Use for DB reads. */
  static create(params: TransactionParams): Transaction {
    if (!params.label.trim()) {
      throw new DomainError("Transaction label must not be empty");
    }
    return new Transaction(params);
  }

  /** Import factory — records a TransactionImported domain event. Use for CSV imports. */
  static import(params: TransactionParams): Transaction {
    const txn = Transaction.create(params);
    txn.addDomainEvent(createTransactionImported(txn.id, txn.label, txn.amount.cents, txn.date));
    return txn;
  }

  categorize(categoryId: CategoryId, ruleId?: CategoryRuleId): Transaction {
    const categorized = Transaction.create({
      amount: this.amount,
      categoryId,
      date: this.date,
      id: this.id,
      label: this.label,
      source: this.source,
    });
    categorized.addDomainEvent(createTransactionCategorized(this.id, categoryId, ruleId));
    return categorized;
  }

  get isCategorized(): boolean {
    return this.categoryId !== undefined;
  }
}
