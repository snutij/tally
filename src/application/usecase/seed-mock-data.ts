import type { MockDataGenerator } from "../gateway/mock-data-generator.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionGateway } from "../gateway/transaction-gateway.js";

export class SeedMockData {
  private readonly txnGateway: TransactionGateway;
  private readonly mockDataGenerator: MockDataGenerator;

  constructor(txnGateway: TransactionGateway, mockDataGenerator: MockDataGenerator) {
    this.txnGateway = txnGateway;
    this.mockDataGenerator = mockDataGenerator;
  }

  execute(monthStr: string): { transactionCount: number } {
    const month = Month.from(monthStr);
    const txns = this.mockDataGenerator.generate(month.year, month.month);
    this.txnGateway.saveAll(txns);
    return { transactionCount: txns.length };
  }
}
