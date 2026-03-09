import { describe, it, expect, beforeEach } from "vitest";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { BankImportGateway } from "../../src/application/gateway/bank-import.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { Money } from "../../src/domain/value-object/money.js";
import { UnknownBankAdapter } from "../../src/domain/error/index.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";

class StubImporter implements BankImportGateway {
  readonly bankName = "test-bank";
  parse(_filePath: string): Transaction[] {
    return [
      {
        id: "tx-1",
        date: new Date("2026-03-01"),
        label: "Test transaction",
        amount: Money.fromEuros(-42.5),
        sourceBank: "test-bank",
      },
      {
        id: "tx-2",
        date: new Date("2026-03-15"),
        label: "Another transaction",
        amount: Money.fromEuros(-10),
        sourceBank: "test-bank",
      },
    ];
  }
}

describe("ImportTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: ImportTransactions;

  beforeEach(() => {
    const importer = new StubImporter();
    txnRepo = new InMemoryTransactionRepository();
    useCase = new ImportTransactions(
      new Map([[importer.bankName, importer]]),
      txnRepo,
    );
  });

  it("parses transactions from bank adapter", () => {
    const transactions = useCase.parse("test-bank", "dummy.csv");
    expect(transactions).toHaveLength(2);
  });

  it("saves transactions and returns count", () => {
    const transactions = useCase.parse("test-bank", "dummy.csv");
    const result = useCase.save(transactions);
    expect(result.count).toBe(2);
    expect(txnRepo.saved).toHaveLength(2);
  });

  it("throws UnknownBankAdapter for unknown bank", () => {
    expect(() => useCase.parse("unknown-bank", "dummy.csv")).toThrow(
      UnknownBankAdapter,
    );
  });

  it("lists available banks", () => {
    expect(useCase.listBanks()).toEqual(["test-bank"]);
  });
});
