import type { Transaction } from "../../domain/entity/transaction.js";

export interface TransactionParser {
  parse(filePath: string): Transaction[];
}
