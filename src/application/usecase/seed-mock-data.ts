import type { MockDataGenerator } from "../gateway/mock-data-generator.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class SeedMockData {
  private readonly txnRepo: TransactionRepository;
  private readonly mockDataGenerator: MockDataGenerator;

  constructor(txnRepo: TransactionRepository, mockDataGenerator: MockDataGenerator) {
    this.txnRepo = txnRepo;
    this.mockDataGenerator = mockDataGenerator;
  }

  execute(monthStr: string): { transactionCount: number } {
    const month = Month.from(monthStr);
    const txns = this.mockDataGenerator.generate(month.year, month.month);
    this.txnRepo.saveAll(txns);
    return { transactionCount: txns.length };
  }
}
