import type { Month } from "../../domain/value-object/month.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class CategorizeTransactions {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  findUncategorized(month: Month): { all: Transaction[]; uncategorized: Transaction[] } {
    const all = this.txnRepo.findByMonth(month);
    return { all, uncategorized: all.filter((txn) => !txn.categoryId) };
  }

  saveCategorized(transactions: Transaction[]): void {
    this.txnRepo.saveAll(transactions);
  }
}
