import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { InvalidMonth } from "../../domain/error/index.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class FindUncategorizedTransactions {
  private readonly txnRepository: TransactionRepository;

  constructor(txnRepository: TransactionRepository) {
    this.txnRepository = txnRepository;
  }

  execute(monthStr: string): { all: TransactionDto[]; uncategorized: TransactionDto[] } {
    let month: Temporal.PlainYearMonth;
    try {
      month = Temporal.PlainYearMonth.from(monthStr);
    } catch {
      throw new InvalidMonth(monthStr);
    }
    const all = this.txnRepository.findByMonth(month);
    return {
      all: all.map((txn) => toTransactionDto(txn)),
      uncategorized: all.filter((txn) => !txn.isCategorized).map((txn) => toTransactionDto(txn)),
    };
  }
}
