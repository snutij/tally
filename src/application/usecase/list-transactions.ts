import type { Month } from "../../domain/value-object/month.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class ListTransactions {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  findByMonth(month: Month): Transaction[] {
    return this.txnRepo.findByMonth(month);
  }
}
