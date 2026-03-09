import type { Transaction } from "../../domain/entity/transaction.js";
import type { Month } from "../../domain/value-object/month.js";

export interface TransactionRepository {
  saveAll(transactions: Transaction[]): void;
  findByIds(ids: string[]): Transaction[];
  findByMonth(month: Month): Transaction[];
}
