import { beforeEach, describe, expect, it } from "vitest";
import type { BankImportGateway } from "../../src/application/gateway/bank-import.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";
import { UnknownBankAdapter } from "../../src/domain/error/index.js";

class StubImporter implements BankImportGateway {
  readonly bankName = "test-bank";
  // eslint-disable-next-line class-methods-use-this -- implements BankImportGateway interface
  parse(_filePath: string): Transaction[] {
    return [
      {
        amount: Money.fromEuros(-42.5),
        date: DateOnly.from("2026-03-01"),
        id: "tx-1",
        label: "Test transaction",
        sourceBank: "test-bank",
      },
      {
        amount: Money.fromEuros(-10),
        date: DateOnly.from("2026-03-15"),
        id: "tx-2",
        label: "Another transaction",
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
    useCase = new ImportTransactions(new Map([[importer.bankName, importer]]), txnRepo);
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
    expect(() => useCase.parse("unknown-bank", "dummy.csv")).toThrow(UnknownBankAdapter);
  });

  it("lists available banks", () => {
    expect(useCase.listBanks()).toEqual(["test-bank"]);
  });
});
