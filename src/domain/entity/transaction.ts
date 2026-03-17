import type { CategoryId } from "../value-object/category-id.js";
import type { CategoryRegistry } from "../service/category-registry.js";
import type { DateOnly } from "../value-object/date-only.js";
import { DomainError } from "../error/index.js";
import type { Money } from "../value-object/money.js";
import type { TransactionId } from "../value-object/transaction-id.js";

export type TransactionSource = "csv" | "mock";

export interface TransactionParams {
  readonly id: TransactionId;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
  readonly categoryId?: CategoryId | undefined;
  readonly source: TransactionSource;
}

export class Transaction {
  readonly id: TransactionId;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
  readonly categoryId: CategoryId | undefined;
  readonly source: TransactionSource;

  private constructor(params: TransactionParams) {
    this.id = params.id;
    this.date = params.date;
    this.label = params.label;
    this.amount = params.amount;
    this.categoryId = params.categoryId;
    this.source = params.source;
  }

  static create(params: TransactionParams): Transaction {
    if (!params.label.trim()) {
      throw new DomainError("Transaction label must not be empty");
    }
    return new Transaction(params);
  }

  categorize(categoryId: CategoryId, registry: CategoryRegistry): Transaction {
    registry.assertValid(categoryId);
    return Transaction.create({
      amount: this.amount,
      categoryId,
      date: this.date,
      id: this.id,
      label: this.label,
      source: this.source,
    });
  }

  get isCategorized(): boolean {
    return this.categoryId !== undefined;
  }
}
