import type { MockDataGenerator } from "../../application/gateway/mock-data-generator.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import { mockTransactions } from "./mock-dataset.js";

export class MockDataGeneratorImpl implements MockDataGenerator {
  generate(year: number, month: number): Transaction[] {
    return mockTransactions(year, month);
  }
}
