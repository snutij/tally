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

  it("serializes categories in report output", () => {
    const budget = new Budget(Month.from("2026-03"), [
      {
        category: { id: "n01", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
    ]);
    const txns = [
      {
        id: "1",
        date: new Date("2026-03-01"),
        label: "Rent",
        amount: Money.fromEuros(-750),
        categoryId: "n01",
        sourceBank: "cm",
      },
    ];
    const report = MonthlyReport.compute(budget, txns);
    const parsed = JSON.parse(renderer.render(report));

    expect(parsed.categories).toHaveLength(1);
    expect(parsed.categories[0]).toEqual({
      categoryId: "n01",
      categoryName: "Rent",
      group: "NEEDS",
      budgeted: 800,
      actual: 750,
      delta: 50,
    });
  });

  it("serializes kpis in report output", () => {
    const budget = new Budget(Month.from("2026-03"), [
      {
        category: { id: "n01", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
      {
        category: { id: "inc01", name: "Salary", group: CategoryGroup.INCOME },
        amount: Money.fromEuros(3000),
      },
    ]);
    const txns = [
      {
        id: "1",
        date: new Date("2026-03-01"),
        label: "Salary",
        amount: Money.fromEuros(3000),
        categoryId: "inc01",
        sourceBank: "cm",
      },
      {
        id: "2",
        date: new Date("2026-03-02"),
        label: "Rent",
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        sourceBank: "cm",
      },
    ];
    const report = MonthlyReport.compute(budget, txns);
    const parsed = JSON.parse(renderer.render(report));

    expect(parsed.kpis).toBeDefined();
    expect(parsed.kpis.savingsRate).toBeCloseTo(73.33, 1);
    expect(parsed.kpis.fiftyThirtyTwenty.needs).toBeCloseTo(26.67, 1);
    expect(parsed.kpis.adherenceRate).toBe(100);
    expect(parsed.kpis.topSpendingCategories).toHaveLength(1);
    expect(parsed.kpis.topSpendingCategories[0].actual).toBe(800);
    expect(parsed.kpis.dailyAverageSpending).toBeCloseTo(800 / 31, 1);
    expect(parsed.kpis.largestExpenses).toHaveLength(1);
    expect(parsed.kpis.largestExpenses[0].label).toBe("Rent");
    expect(parsed.kpis.largestExpenses[0].date).toBe("2026-03-02");
    expect(parsed.kpis.largestExpenses[0].amount).toBe(-800);
    expect(parsed.kpis.uncategorizedRatio).toBe(0);
    expect(parsed.kpis.categoryVariance.overruns).toHaveLength(0);
    expect(parsed.kpis.categoryVariance.underruns).toHaveLength(0);
  });

  it("serializes category variance overruns", () => {
    const budget = new Budget(Month.from("2026-03"), [
      {
        category: { id: "n01", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
    ]);
    const txns = [
      {
        id: "1",
        date: new Date("2026-03-01"),
        label: "Rent",
        amount: Money.fromEuros(-900),
        categoryId: "n01",
        sourceBank: "cm",
      },
    ];
    const report = MonthlyReport.compute(budget, txns);
    const parsed = JSON.parse(renderer.render(report));

    expect(parsed.kpis.categoryVariance.overruns).toHaveLength(1);
    expect(parsed.kpis.categoryVariance.overruns[0]).toEqual({
      categoryId: "n01",
      categoryName: "Rent",
      budgeted: 800,
      actual: 900,
      variance: 100,
    });
  });

  it("passes through plain objects", () => {
    const data = { foo: "bar" };
    expect(JSON.parse(renderer.render(data))).toEqual({ foo: "bar" });
  });
});
