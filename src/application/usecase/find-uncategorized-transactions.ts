import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../port/transaction-repository.js";

export class FindUncategorizedTransactions {
  private readonly txnRepository: TransactionRepository;

  constructor(txnRepository: TransactionRepository) {
    this.txnRepository = txnRepository;
  }

  execute(monthStr: string): { all: TransactionDto[]; uncategorized: TransactionDto[] } {
    const month = Month.from(monthStr);
    const all = this.txnRepository.findByMonth(month);
    return {
      all: all.map((txn) => toTransactionDto(txn)),
      uncategorized: all.filter((txn) => !txn.isCategorized).map((txn) => toTransactionDto(txn)),
    };
  }
}
