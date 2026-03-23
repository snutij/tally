import type { Transaction } from "../../domain/entity/transaction.js";

export interface TransactionDto {
  readonly amount: number;
  readonly categoryId: string | undefined;
  /** AI-suggested category (from embedding-based matching). Not yet confirmed by user. */
  readonly suggestedCategoryId: string | undefined;
  readonly date: string;
  readonly id: string;
  readonly label: string;
  readonly source: string;
}

export function toTransactionDto(txn: Transaction): TransactionDto {
  return {
    amount: txn.amount.toEuros(),
    categoryId: txn.categoryId as string | undefined,
    date: txn.date.toString(),
    id: txn.id,
    label: txn.label,
    source: txn.source,
    suggestedCategoryId: undefined,
  };
}
