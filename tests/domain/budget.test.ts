import { describe, expect, it } from "vitest";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("Budget", () => {
  const month = Month.from("2026-03");

  const lines = [
    {
      amount: Money.fromEuros(800),
      category: { group: CategoryGroup.NEEDS, id: "rent", name: "Rent" },
    },
    {
      amount: Money.fromEuros(400),
      category: { group: CategoryGroup.NEEDS, id: "groceries", name: "Groceries" },
    },
    {
      amount: Money.fromEuros(150),
      category: { group: CategoryGroup.WANTS, id: "dining-out", name: "Dining out" },
    },
    {
      amount: Money.fromEuros(200),
      category: { group: CategoryGroup.INVESTMENTS, id: "pea", name: "PEA" },
    },
  ];

  it("computes total by group", () => {
    const budget = new Budget(month, lines);
    expect(budget.totalByGroup(CategoryGroup.NEEDS).cents).toBe(120_000);
    expect(budget.totalByGroup(CategoryGroup.WANTS).cents).toBe(15_000);
    expect(budget.totalByGroup(CategoryGroup.INVESTMENTS).cents).toBe(20_000);
  });

  it("computes total", () => {
    const budget = new Budget(month, lines);
    expect(budget.total().cents).toBe(155_000);
  });

  it("handles empty budget", () => {
    const budget = new Budget(month, []);
    expect(budget.total().cents).toBe(0);
    expect(budget.totalByGroup(CategoryGroup.NEEDS).cents).toBe(0);
  });
});
