import type { Month } from "../../domain/value-object/month.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionId } from "../../domain/value-object/transaction-id.js";

export interface TransactionRepository {
  saveAll(transactions: Transaction[]): void;
  findByIds(ids: TransactionId[]): Transaction[];
  findByMonth(month: Month): Transaction[];
}
