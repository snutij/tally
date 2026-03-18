import type { MockDataGenerator } from "../port/mock-data-generator.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../port/transaction-repository.js";

export class SeedMockData {
  private readonly txnRepository: TransactionRepository;
  private readonly mockDataGenerator: MockDataGenerator;

  constructor(txnRepository: TransactionRepository, mockDataGenerator: MockDataGenerator) {
    this.txnRepository = txnRepository;
    this.mockDataGenerator = mockDataGenerator;
  }

  execute(monthStr: string): { transactionCount: number } {
    const month = Month.from(monthStr);
    const txns = this.mockDataGenerator.generate(month.year, month.month);
    this.txnRepository.saveAll(txns);
    return { transactionCount: txns.length };
  }
}
