import { beforeEach, describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DEFAULT_CATEGORY_REGISTRY } from "../../src/domain/default-categories.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { DomainError } from "../../src/domain/error/index.js";
import { FindUncategorizedTransactions } from "../../src/application/usecase/find-uncategorized-transactions.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import { SaveCategorizedTransactions } from "../../src/application/usecase/save-categorized-transactions.js";
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

describe("FindUncategorizedTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: FindUncategorizedTransactions;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new FindUncategorizedTransactions(txnRepo);
  });

  it("returns all transactions and only uncategorized ones", () => {
    txnRepo.saveAll([txn("t1"), txn("t2", "n01")]);
    const { all, uncategorized } = useCase.execute("2026-03");
    expect(all).toHaveLength(2);
    expect(uncategorized).toHaveLength(1);
    expect(uncategorized[0]?.id).toBe("t1");
  });

  it("returns empty uncategorized when all are categorized", () => {
    txnRepo.saveAll([txn("t1", "n01"), txn("t2", "w01")]);
    const { uncategorized } = useCase.execute("2026-03");
    expect(uncategorized).toHaveLength(0);
  });

  it("returns empty all when no transactions exist", () => {
    const { all, uncategorized } = useCase.execute("2026-03");
    expect(all).toHaveLength(0);
    expect(uncategorized).toHaveLength(0);
  });

  it("returns DTOs (not domain entities)", () => {
    txnRepo.saveAll([txn("t1")]);
    const { all } = useCase.execute("2026-03");
    const [dto] = all;
    expect(typeof dto?.amount).toBe("number");
    expect(typeof dto?.date).toBe("string");
  });

  it("throws on invalid month format", () => {
    expect(() => useCase.execute("invalid")).toThrow(DomainError);
  });
});

describe("SaveCategorizedTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: SaveCategorizedTransactions;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new SaveCategorizedTransactions(txnRepo, DEFAULT_CATEGORY_REGISTRY);
  });

  it("persists categorized transactions", () => {
    txnRepo.saveAll([txn("t1")]);
    const { categorizedCount } = useCase.execute([{ categoryId: "n01", id: "t1" }]);
    expect(categorizedCount).toBe(1);
    const savedWithCategory = txnRepo.saved.find((txnItem) => txnItem.categoryId !== undefined);
    expect(savedWithCategory?.categoryId).toBe("n01");
  });

  it("throws when assignments list is empty", () => {
    expect(() => useCase.execute([])).toThrow(DomainError);
  });

  it("returns categorizedCount reflecting saved transactions", () => {
    txnRepo.saveAll([txn("t1"), txn("t2")]);
    const { categorizedCount } = useCase.execute([
      { categoryId: "n01", id: "t1" },
      { categoryId: "w01", id: "t2" },
    ]);
    expect(categorizedCount).toBe(2);
  });
});
