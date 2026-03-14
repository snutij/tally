import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionParser } from "../gateway/transaction-parser.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class ImportTransactions {
  private readonly txnRepo: TransactionRepository;

  constructor(txnRepo: TransactionRepository) {
    this.txnRepo = txnRepo;
  }

  // eslint-disable-next-line class-methods-use-this -- use case API: delegates to injected parser
  parse(parser: TransactionParser, filePath: string): Transaction[] {
    return parser.parse(filePath);
  }

  splitByCategoryStatus(transactions: Transaction[]): {
    alreadyCategorized: Transaction[];
    uncategorized: Transaction[];
  } {
    const existing = this.txnRepo.findByIds(transactions.map((txn) => txn.id));
    const categorizedIds = new Set(existing.filter((txn) => txn.categoryId).map((txn) => txn.id));
    const alreadyCategorized: Transaction[] = [];
    const uncategorized: Transaction[] = [];
    for (const txn of transactions) {
      const match = categorizedIds.has(txn.id)
        ? existing.find((ex) => ex.id === txn.id)
        : undefined;
      if (match) {
        alreadyCategorized.push(match);
      } else {
        uncategorized.push(txn);
      }
    }
    return { alreadyCategorized, uncategorized };
  }

  save(transactions: Transaction[]): { count: number } {
    this.txnRepo.saveAll(transactions);
    return { count: transactions.length };
  }
}
