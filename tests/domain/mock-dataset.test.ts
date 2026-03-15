import { describe, expect, it } from "vitest";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { mockTransactions } from "../../src/domain/mock-dataset.js";

describe("mockTransactions", () => {
  const txns = mockTransactions(2026, 3);
  const validIds = new Set(DEFAULT_CATEGORIES.map((cat) => cat.id));

  it("contains at least 15 transactions", () => {
    expect(txns.length).toBeGreaterThanOrEqual(15);
  });

  it("covers all category groups", () => {
    const categorized = txns.filter((txn) => txn.categoryId);
    const groups = new Set(
      categorized.map((txn) => {
        const cat = DEFAULT_CATEGORIES.find((dc) => dc.id === txn.categoryId);
        return cat?.group;
      }),
    );
    expect(groups).toContain(CategoryGroup.NEEDS);
    expect(groups).toContain(CategoryGroup.WANTS);
    expect(groups).toContain(CategoryGroup.INVESTMENTS);
    expect(groups).toContain(CategoryGroup.INCOME);
  });

  it("includes at least 2 uncategorized transactions", () => {
    const uncategorized = txns.filter((txn) => !txn.categoryId);
    expect(uncategorized.length).toBeGreaterThanOrEqual(2);
  });

  it("uses only valid DEFAULT_CATEGORIES IDs", () => {
    for (const txn of txns) {
      if (txn.categoryId) {
        expect(validIds).toContain(txn.categoryId);
      }
    }
  });

  it("generates unique IDs", () => {
    const ids = txns.map((txn) => txn.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
