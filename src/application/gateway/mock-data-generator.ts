import type { Transaction } from "../../domain/entity/transaction.js";

export interface MockDataGenerator {
  generate(year: number, month: number): Transaction[];
}
