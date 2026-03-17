import { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { mockTransactions } from "../../infrastructure/mock/mock-dataset.js";

export class SeedMockData {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  execute(monthStr: string): { transactionCount: number } {
    const month = Month.from(monthStr);
    const txns = mockTransactions(month.year, month.month);
    this.txnRepo.saveAll(txns);
    return { transactionCount: txns.length };
  }
}
