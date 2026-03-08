import { describe, it, expect } from "vitest";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("Budget", () => {
  const month = Month.from("2026-03");

  const lines = [
    {
      category: { id: "rent", name: "Rent", group: CategoryGroup.NEEDS },
      amount: Money.fromEuros(800),
    },
    {
      category: { id: "groceries", name: "Groceries", group: CategoryGroup.NEEDS },
      amount: Money.fromEuros(400),
    },
    {
      category: { id: "dining-out", name: "Dining out", group: CategoryGroup.WANTS },
      amount: Money.fromEuros(150),
    },
    {
      category: { id: "pea", name: "PEA", group: CategoryGroup.INVESTMENTS },
      amount: Money.fromEuros(200),
    },
  ];

  it("computes total by group", () => {
    const budget = new Budget(month, lines);
    expect(budget.totalByGroup(CategoryGroup.NEEDS).cents).toBe(120000);
    expect(budget.totalByGroup(CategoryGroup.WANTS).cents).toBe(15000);
    expect(budget.totalByGroup(CategoryGroup.INVESTMENTS).cents).toBe(20000);
  });

  it("computes total", () => {
    const budget = new Budget(month, lines);
    expect(budget.total().cents).toBe(155000);
  });

  it("handles empty budget", () => {
    const budget = new Budget(month, []);
    expect(budget.total().cents).toBe(0);
    expect(budget.totalByGroup(CategoryGroup.NEEDS).cents).toBe(0);
  });
});
