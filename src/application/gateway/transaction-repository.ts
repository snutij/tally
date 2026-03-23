import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionId } from "../../domain/value-object/transaction-id.js";

export interface TransactionRepository {
  saveAll(transactions: Transaction[]): void;
  findByIds(ids: TransactionId[]): Transaction[];
  findByMonth(month: Temporal.PlainYearMonth): Transaction[];
  /** Returns unique label→categoryId pairs for all categorized transactions. Used for embedding index seeding. */
  findUniqueCategorizedLabels(): { label: string; categoryId: string }[];
}
