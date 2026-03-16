import type { DateOnly } from "../value-object/date-only.js";
import type { Money } from "../value-object/money.js";

export type TransactionSource = "csv" | "mock";

export interface TransactionParams {
  readonly id: string;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
  readonly categoryId?: string | undefined;
  readonly source: TransactionSource;
}

export class Transaction {
  readonly id: string;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
  readonly categoryId: string | undefined;
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
    return new Transaction(params);
  }

  categorize(categoryId: string): Transaction {
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
