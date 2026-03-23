import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionId } from "../../domain/value-object/transaction-id.js";

export interface TransactionRepository {
  saveAll(transactions: Transaction[]): void;
  findByIds(ids: TransactionId[]): Transaction[];
  findByMonth(month: Temporal.PlainYearMonth): Transaction[];
  /** Returns all transactions that have a categoryId set. Used for embedding index seeding. */
  findAllCategorized(): Transaction[];
}
