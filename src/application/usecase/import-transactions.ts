import { Transaction } from "../../domain/entity/transaction.js";
import { UnknownBankAdapter } from "../../domain/error/index.js";
import { BankImportGateway } from "../gateway/bank-import.js";
import { TransactionRepository } from "../gateway/transaction-repository.js";

export class ImportTransactions {
  constructor(
    private importers: Map<string, BankImportGateway>,
    private txnRepo: TransactionRepository,
  ) {}

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
    const existing = this.txnRepo.findByIds(transactions.map((t) => t.id));
    const categorizedIds = new Set(
      existing.filter((t) => t.categoryId).map((t) => t.id),
    );
    const alreadyCategorized: Transaction[] = [];
    const uncategorized: Transaction[] = [];
    for (const t of transactions) {
      if (categorizedIds.has(t.id)) {
        const ex = existing.find((e) => e.id === t.id)!;
        alreadyCategorized.push(ex);
      } else {
        uncategorized.push(t);
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
