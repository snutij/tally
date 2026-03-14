import type { Month } from "../../domain/value-object/month.js";
import type { Transaction } from "../../domain/entity/transaction.js";

export interface TransactionRepository {
  saveAll(transactions: Transaction[]): void;
  findByIds(ids: string[]): Transaction[];
  findByMonth(month: Month): Transaction[];
}
