import type { MockDataGenerator } from "../../application/gateway/mock-data-generator.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import { demoTransactions } from "./demo-dataset.js";

export class DemoDataGeneratorImpl implements MockDataGenerator {
  generate(year: number, month: number): Transaction[] {
    return demoTransactions(year, month);
  }
}
