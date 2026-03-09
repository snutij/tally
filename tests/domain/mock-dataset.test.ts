import { describe, it, expect } from "vitest";
import { mockTransactions, MOCK_BUDGET_AMOUNTS } from "../../src/domain/mock-dataset.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";

describe("mockTransactions", () => {
  const txns = mockTransactions(2026, 3);
  const validIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

  it("contains at least 15 transactions", () => {
    expect(txns.length).toBeGreaterThanOrEqual(15);
  });

  it("covers all category groups", () => {
    const categorized = txns.filter((t) => t.categoryId);
    const groups = new Set(
      categorized.map((t) => {
        const cat = DEFAULT_CATEGORIES.find((c) => c.id === t.categoryId);
        return cat?.group;
      }),
    );
    expect(groups).toContain(CategoryGroup.NEEDS);
    expect(groups).toContain(CategoryGroup.WANTS);
    expect(groups).toContain(CategoryGroup.INVESTMENTS);
    expect(groups).toContain(CategoryGroup.INCOME);
  });

  it("includes at least 2 uncategorized transactions", () => {
    const uncategorized = txns.filter((t) => !t.categoryId);
    expect(uncategorized.length).toBeGreaterThanOrEqual(2);
  });

  it("uses only valid DEFAULT_CATEGORIES IDs", () => {
    for (const t of txns) {
      if (t.categoryId) {
        expect(validIds).toContain(t.categoryId);
      }
    }
  });

  it("generates unique IDs", () => {
    const ids = txns.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("MOCK_BUDGET_AMOUNTS", () => {
  const validIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

  it("uses only valid DEFAULT_CATEGORIES IDs", () => {
    for (const id of Object.keys(MOCK_BUDGET_AMOUNTS)) {
      expect(validIds).toContain(id);
    }
  });

  it("has non-zero amounts", () => {
    for (const amount of Object.values(MOCK_BUDGET_AMOUNTS)) {
      expect(amount).toBeGreaterThan(0);
    }
  });
});
