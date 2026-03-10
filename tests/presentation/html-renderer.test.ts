import { describe, expect, it } from "vitest";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import { Month } from "../../src/domain/value-object/month.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";

describe("HtmlRenderer", () => {
  const renderer = new HtmlRenderer();

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
      amount: Money.fromEuros(-750),
      categoryId: "n01",
      date: DateOnly.from("2026-03-02"),
      id: "2",
      label: "Rent",
      sourceBank: "cm",
    },
  ];

  describe("render(MonthlyReport)", () => {
    const report = MonthlyReport.compute(budget, txns);
    const html = renderer.render(report);

    it("produces a valid HTML5 document", () => {
      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
    });

    it("includes inline styles", () => {
      expect(html).toContain("<style>");
      expect(html).not.toContain('<link rel="stylesheet"');
    });

    it("contains KPI section", () => {
      expect(html).toContain("Key Indicators");
      expect(html).toContain("Savings Rate");
      expect(html).toContain("Budget Adherence");
      expect(html).toContain("Daily Avg Spending");
    });

    it("renders tooltip trigger and content for each KPI", () => {
      for (const label of [
        "Savings Rate",
        "Budget Adherence",
        "Daily Avg Spending",
        "Uncategorized",
      ]) {
        expect(html).toContain(`aria-label="About ${label}"`);
        expect(html).toContain('role="tooltip"');
      }
      expect(html).toContain("Percentage of income kept after all expenses");
      expect(html).toContain("Aim for 90%+");
      expect(html).toContain("tally transactions categorize");
    });

    it("contains group summary table", () => {
      expect(html).toContain("Group Summary");
      expect(html).toContain("NEEDS");
      expect(html).toContain("INCOME");
    });

    it("contains category breakdown table", () => {
      expect(html).toContain("Category Breakdown");
      expect(html).toContain("Rent");
      expect(html).toContain("Salary");
    });

    it("uses Money.format() for amounts", () => {
      expect(html).toContain("800.00 €");
      expect(html).toContain("750.00 €");
    });

    it("applies color classes for deltas", () => {
      expect(html).toContain("under-budget");
    });
  });

  describe("render(MonthlyReport) — no transactions", () => {
    it("omits insights section when there are no expense transactions", () => {
      const incomeOnly = new Budget(Month.from("2026-03"), [
        {
          amount: Money.fromEuros(3000),
          category: { group: CategoryGroup.INCOME, id: "inc01", name: "Salary" },
        },
      ]);
      const report = MonthlyReport.compute(incomeOnly, []);
      const html = renderer.render(report);
      const body = html.split("<body>")[1];
      expect(body).not.toContain("Top Spending");
      expect(body).not.toContain("Largest Expenses");
    });
  });

  describe("render(MonthlyReport) — uncategorized", () => {
    it("shows uncategorized section when non-zero", () => {
      const uncatTxns = [
        {
          amount: Money.fromEuros(-100),
          categoryId: undefined,
          date: DateOnly.from("2026-03-05"),
          id: "3",
          label: "Mystery",
          sourceBank: "cm",
        },
      ];
      const report = MonthlyReport.compute(budget, uncatTxns);
      const html = renderer.render(report);
      expect(html).toContain("Uncategorized");
      expect(html).toContain("100.00 €");
    });

    it("omits uncategorized section when zero", () => {
      const report = MonthlyReport.compute(budget, txns);
      const html = renderer.render(report);
      expect(html).not.toContain('class="uncategorized"');
    });
  });

  describe("render(Budget)", () => {
    const html = renderer.render(budget);

    it("produces a valid HTML5 document", () => {
      expect(html).toMatch(/^<!DOCTYPE html>/);
    });

    it("contains budget lines", () => {
      expect(html).toContain("Rent");
      expect(html).toContain("800.00 €");
      expect(html).toContain("Salary");
      expect(html).toContain("3000.00 €");
    });

    it("contains total row", () => {
      expect(html).toContain("Total");
      expect(html).toContain("3800.00 €");
    });
  });

  it("does not render tooltip markup in Budget view body", () => {
    const html = renderer.render(budget);
    const body = html.split("<body>")[1];
    expect(body).not.toContain("kpi-help");
    expect(body).not.toContain("kpi-tooltip");
  });

  it("passes through plain objects as JSON pre block", () => {
    const html = renderer.render({ foo: "bar" });
    expect(html).toContain("<pre>");
    expect(html).toContain("foo");
  });
});
