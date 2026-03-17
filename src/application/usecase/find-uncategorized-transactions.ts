import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class FindUncategorizedTransactions {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  execute(monthStr: string): { all: TransactionDto[]; uncategorized: TransactionDto[] } {
    const month = Month.from(monthStr);
    const all = this.txnRepo.findByMonth(month);
    return {
      all: all.map((txn) => toTransactionDto(txn)),
      uncategorized: all.filter((txn) => !txn.categoryId).map((txn) => toTransactionDto(txn)),
    };
  }
}
