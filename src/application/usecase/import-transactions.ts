import type { BankImportGateway } from "../gateway/bank-import.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";
import { UnknownBankAdapter } from "../../domain/error/index.js";

export class ImportTransactions {
  private importers: Map<string, BankImportGateway>;
  private txnRepo: TransactionRepository;

  constructor(importers: Map<string, BankImportGateway>, txnRepo: TransactionRepository) {
    this.importers = importers;
    this.txnRepo = txnRepo;
  }

  parse(bankName: string, filePath: string): Transaction[] {
    const importer = this.importers.get(bankName);
    if (!importer) {
      throw new UnknownBankAdapter(bankName);
    }
    return importer.parse(filePath);
  }

  /**
   * Splits parsed transactions into already-categorized (in DB) and uncategorized.
   */
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

  listBanks(): string[] {
    return [...this.importers.keys()];
  }
}
