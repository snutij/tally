import { describe, it, expect } from "vitest";
import { JsonRenderer } from "../../src/presentation/renderer/json-renderer.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Money } from "../../src/domain/value-object/money.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";

describe("JsonRenderer", () => {
  const renderer = new JsonRenderer();

  it("serializes a Budget", () => {
    const budget = new Budget(Month.from("2026-03"), [
      {
        category: { id: "n01", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
    ]);
    const parsed = JSON.parse(renderer.render(budget));
    expect(parsed.month).toBe("2026-03");
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0].amount).toBe(800);
    expect(parsed.total).toBe(800);
  });

  it("serializes a MonthlyReport", () => {
    const budget = new Budget(Month.from("2026-03"), [
      {
        category: { id: "n01", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
      {
        category: { id: "inc01", name: "Salary", group: CategoryGroup.INCOME },
        amount: Money.fromEuros(2500),
      },
    ]);
    const report = MonthlyReport.compute(budget, []);
    const parsed = JSON.parse(renderer.render(report));
    expect(parsed.month).toBe("2026-03");
    expect(parsed.groups).toHaveLength(4);
    expect(parsed.net).toBe(0);
    expect(parsed.transactionCount).toBe(0);
  });

  it("passes through plain objects", () => {
    const data = { foo: "bar" };
    expect(JSON.parse(renderer.render(data))).toEqual({ foo: "bar" });
  });
});
