import { describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

const BASE_PARAMS = {
  amount: Money.fromEuros(-42),
  date: DateOnly.from("2026-03-15"),
  id: TransactionId("t1"),
  label: "CARREFOUR CITY",
  source: "csv" as const,
};

describe("Transaction", () => {
  describe("create()", () => {
    it("creates a valid transaction", () => {
      const txn = Transaction.create(BASE_PARAMS);
      expect(txn.id).toBe("t1");
      expect(txn.label).toBe("CARREFOUR CITY");
      expect(txn.amount.cents).toBe(-4200);
      expect(txn.source).toBe("csv");
      expect(txn.categoryId).toBeUndefined();
    });

    it("creates an uncategorized transaction when categoryId is omitted", () => {
      const txn = Transaction.create(BASE_PARAMS);
      expect(txn.categoryId).toBeUndefined();
    });

    it("creates a pre-categorized transaction when categoryId is provided", () => {
      const txn = Transaction.create({ ...BASE_PARAMS, categoryId: CategoryId("n01") });
      expect(txn.categoryId).toBe("n01");
    });

    it("returns a Transaction instance", () => {
      const txn = Transaction.create(BASE_PARAMS);
      expect(txn).toBeInstanceOf(Transaction);
    });
  });

  describe("categorize()", () => {
    it("returns a new Transaction with the given categoryId", () => {
      const txn = Transaction.create(BASE_PARAMS);
      const categorized = txn.categorize(CategoryId("n02"));
      expect(categorized.categoryId).toBe("n02");
    });

    it("preserves all other fields", () => {
      const txn = Transaction.create(BASE_PARAMS);
      const categorized = txn.categorize(CategoryId("n02"));
      expect(categorized.id).toBe(txn.id);
      expect(categorized.label).toBe(txn.label);
      expect(categorized.amount.cents).toBe(txn.amount.cents);
      expect(categorized.date.toString()).toBe(txn.date.toString());
      expect(categorized.source).toBe(txn.source);
    });

    it("does not mutate the original", () => {
      const txn = Transaction.create(BASE_PARAMS);
      txn.categorize(CategoryId("n02"));
      expect(txn.categoryId).toBeUndefined();
    });

    it("re-categorization replaces the categoryId", () => {
      const txn = Transaction.create({ ...BASE_PARAMS, categoryId: CategoryId("n01") });
      const recategorized = txn.categorize(CategoryId("w02"));
      expect(recategorized.categoryId).toBe("w02");
      expect(txn.categoryId).toBe("n01"); // original unchanged
    });

    it("returns a Transaction instance", () => {
      const txn = Transaction.create(BASE_PARAMS);
      expect(txn.categorize(CategoryId("n01"))).toBeInstanceOf(Transaction);
    });
  });

  describe("isCategorized", () => {
    it("returns false when uncategorized", () => {
      const txn = Transaction.create(BASE_PARAMS);
      expect(txn.isCategorized).toBe(false);
    });

    it("returns true when categorized", () => {
      const txn = Transaction.create({ ...BASE_PARAMS, categoryId: CategoryId("n01") });
      expect(txn.isCategorized).toBe(true);
    });

    it("returns true after categorize()", () => {
      const txn = Transaction.create(BASE_PARAMS);
      expect(txn.categorize(CategoryId("n01")).isCategorized).toBe(true);
    });
  });

  it("serializes to JSON correctly (enumerable properties)", () => {
    const txn = Transaction.create({ ...BASE_PARAMS, categoryId: CategoryId("n01") });
    const jsonStr = JSON.stringify(txn);
    // All fields should be in the JSON output
    expect(jsonStr).toContain('"id":"t1"');
    expect(jsonStr).toContain('"categoryId":"n01"');
    expect(jsonStr).toContain('"source":"csv"');
  });
});
