import { beforeEach, describe, expect, it } from "vitest";
import { CategorizeTransactions } from "../../src/application/usecase/categorize-transactions.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

function txn(id: string, categoryId?: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(-10),
    categoryId: categoryId ? CategoryId(categoryId) : undefined,
    date: DateOnly.from("2026-03-15"),
    id: TransactionId(id),
    label: "TEST",
    source: "csv",
  });
}

describe("CategorizeTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: CategorizeTransactions;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new CategorizeTransactions(txnRepo);
  });

  describe("findUncategorized", () => {
    it("returns all transactions and only uncategorized ones", () => {
      txnRepo.saveAll([txn("t1"), txn("t2", "n01")]);
      const { all, uncategorized } = useCase.findUncategorized(Month.from("2026-03"));
      expect(all).toHaveLength(2);
      expect(uncategorized).toHaveLength(1);
      expect(uncategorized[0]?.id).toBe("t1");
    });

    it("returns empty uncategorized when all are categorized", () => {
      txnRepo.saveAll([txn("t1", "n01"), txn("t2", "w01")]);
      const { uncategorized } = useCase.findUncategorized(Month.from("2026-03"));
      expect(uncategorized).toHaveLength(0);
    });

    it("returns empty all when no transactions exist", () => {
      const { all, uncategorized } = useCase.findUncategorized(Month.from("2026-03"));
      expect(all).toHaveLength(0);
      expect(uncategorized).toHaveLength(0);
    });
  });

  describe("saveCategorized", () => {
    it("persists categorized transactions", () => {
      const categorized = txn("t1").categorize(CategoryId("n01"));
      useCase.saveCategorized([categorized]);
      const saved = txnRepo.findByMonth(Month.from("2026-03"));
      expect(saved[0]?.categoryId).toBe("n01");
    });
  });
});
