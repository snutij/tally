import type { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { mockTransactions } from "../../infrastructure/mock/mock-dataset.js";

export class SeedMockData {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  execute(month: Month): { transactionCount: number } {
    const txns = mockTransactions(month.year, month.month);
    this.txnRepo.saveAll(txns);
    return { transactionCount: txns.length };
  }
}
