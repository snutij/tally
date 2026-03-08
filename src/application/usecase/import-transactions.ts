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

  save(transactions: Transaction[]): { count: number } {
    this.txnRepo.saveAll(transactions);
    return { count: transactions.length };
  }

  listBanks(): string[] {
    return [...this.importers.keys()];
  }
}
