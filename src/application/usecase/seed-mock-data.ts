import { InvalidMonth } from "../../domain/error/index.js";
import type { MockDataGenerator } from "../gateway/mock-data-generator.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class SeedMockData {
  private readonly txnRepository: TransactionRepository;
  private readonly mockDataGenerator: MockDataGenerator;

  constructor(txnRepository: TransactionRepository, mockDataGenerator: MockDataGenerator) {
    this.txnRepository = txnRepository;
    this.mockDataGenerator = mockDataGenerator;
  }

  execute(monthStr: string): { transactionCount: number } {
    let month: Temporal.PlainYearMonth;
    try {
      month = Temporal.PlainYearMonth.from(monthStr);
    } catch {
      throw new InvalidMonth(monthStr);
    }
    const txns = this.mockDataGenerator.generate(month.year, month.month);
    this.txnRepository.saveAll(txns);
    return { transactionCount: txns.length };
  }
}
