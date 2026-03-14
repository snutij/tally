import { describe, expect, it } from "vitest";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { JsonRenderer } from "../../src/presentation/renderer/json-renderer.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";

describe("JsonRenderer", () => {
  const renderer = new JsonRenderer();

  it("serializes a Budget", () => {
    const budget = new Budget(Month.from("2026-03"), [
      {
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
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
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
      },
      {
        amount: Money.fromEuros(2500),
        category: { group: CategoryGroup.INCOME, id: "inc01", name: "Salary" },
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
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
      },
    ]);
    const txns = [
      {
        amount: Money.fromEuros(-750),
        categoryId: "n01",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Rent",
        sourceBank: "cm",
      },
    ];
    const report = MonthlyReport.compute(budget, txns);
    const parsed = JSON.parse(renderer.render(report));

    expect(parsed.categories).toHaveLength(1);
    expect(parsed.categories[0]).toEqual({
      actual: 750,
      budgeted: 800,
      categoryId: "n01",
      categoryName: "Rent",
      delta: 50,
      group: "NEEDS",
    });
  });

  it("serializes kpis in report output", () => {
    const budget = new Budget(Month.from("2026-03"), [
      {
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
      },
      {
        amount: Money.fromEuros(3000),
        category: { group: CategoryGroup.INCOME, id: "inc01", name: "Salary" },
      },
    ]);
    const txns = [
      {
        amount: Money.fromEuros(3000),
        categoryId: "inc01",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Salary",
        sourceBank: "cm",
      },
      {
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        date: DateOnly.from("2026-03-02"),
        id: "2",
        label: "Rent",
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
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
      },
    ]);
    const txns = [
      {
        amount: Money.fromEuros(-900),
        categoryId: "n01",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Rent",
        sourceBank: "cm",
      },
    ];
    const report = MonthlyReport.compute(budget, txns);
    const parsed = JSON.parse(renderer.render(report));

    expect(parsed.kpis.categoryVariance.overruns).toHaveLength(1);
    expect(parsed.kpis.categoryVariance.overruns[0]).toEqual({
      actual: 900,
      budgeted: 800,
      categoryId: "n01",
      categoryName: "Rent",
      variance: 100,
    });
  });

  it("passes through plain objects", () => {
    const data = { foo: "bar" };
    expect(JSON.parse(renderer.render(data))).toEqual({ foo: "bar" });
  });
});
