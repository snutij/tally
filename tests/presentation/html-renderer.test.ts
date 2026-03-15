import { describe, expect, it } from "vitest";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";

const targets = DEFAULT_SPENDING_TARGETS;

const txns = [
  {
    amount: Money.fromEuros(3000),
    categoryId: "inc01",
    date: DateOnly.from("2026-03-01"),
    id: "1",
    label: "Salary",
    source: "cm",
  },
  {
    amount: Money.fromEuros(-750),
    categoryId: "n01",
    date: DateOnly.from("2026-03-02"),
    id: "2",
    label: "Rent",
    source: "cm",
  },
];

describe("HtmlRenderer", () => {
  const renderer = new HtmlRenderer();

  describe("render(MonthlyReport)", () => {
    const report = MonthlyReport.compute(Month.from("2026-03"), targets, txns);
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

    it("contains KPI section without Budget Adherence", () => {
      expect(html).toContain("Key Indicators");
      expect(html).toContain("Savings Rate");
      expect(html).not.toContain("Budget Adherence");
      expect(html).toContain("Daily Avg Spending");
    });

    it("renders tooltip trigger and content for remaining KPIs", () => {
      for (const label of ["Savings Rate", "Daily Avg Spending", "Uncategorized"]) {
        expect(html).toContain(`aria-label="About ${label}"`);
      }
      expect(html).toContain("Percentage of income kept after all expenses");
      expect(html).toContain("tally transactions categorize");
    });

    it("contains group summary table", () => {
      expect(html).toContain("Group Summary");
      expect(html).toContain("NEEDS");
      expect(html).toContain("INCOME");
    });

    it("does not contain category breakdown table", () => {
      expect(html).not.toContain("Category Breakdown");
    });

    it("footer shows Expense Target instead of Budgeted labels", () => {
      expect(html).toContain("Expense Target");
      expect(html).not.toContain("Income (Budgeted)");
      expect(html).not.toContain("Expenses (Budgeted)");
    });

    it("uses Money.format() for amounts", () => {
      expect(html).toContain("750.00 €");
    });
  });

  describe("render(MonthlyReport) — no transactions", () => {
    it("omits insights section when there are no expense transactions", () => {
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, []);
      const html = renderer.render(report);
      const [, body] = html.split("<body>");
      expect(body).not.toContain("Top Spending");
      expect(body).not.toContain("Largest Expenses");
    });
  });

  describe("render(MonthlyReport) — insights edge cases", () => {
    it("shows largest expenses but no top spending when all uncategorized", () => {
      const uncatTxns = [
        {
          amount: Money.fromEuros(-200),
          date: DateOnly.from("2026-03-05"),
          id: "1",
          label: "Mystery purchase",
          source: "cm",
        },
      ];
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, uncatTxns);
      const html = renderer.render(report);
      const [, body] = html.split("<body>");
      expect(body).toContain("Largest Expenses");
      expect(body).not.toContain("Top Spending");
    });

    it("shows top spending but no largest expenses when only refunds", () => {
      const refundTxns = [
        {
          amount: Money.fromEuros(100),
          categoryId: "n01",
          date: DateOnly.from("2026-03-05"),
          id: "1",
          label: "Rent refund",
          source: "cm",
        },
      ];
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, refundTxns);
      const html = renderer.render(report);
      const [, body] = html.split("<body>");
      expect(body).toContain("Top Spending");
      expect(body).not.toContain("Largest Expenses");
    });
  });

  describe("render(MonthlyReport) — uncategorized", () => {
    it("shows uncategorized section when non-zero", () => {
      const uncatTxns = [
        {
          amount: Money.fromEuros(-100),
          date: DateOnly.from("2026-03-05"),
          id: "3",
          label: "Mystery",
          source: "cm",
        },
      ];
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, uncatTxns);
      const html = renderer.render(report);
      expect(html).toContain("Uncategorized");
      expect(html).toContain("100.00 €");
    });

    it("omits uncategorized section when zero", () => {
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, txns);
      const html = renderer.render(report);
      expect(html).not.toContain('class="uncategorized"');
    });
  });

  it("passes through plain objects as JSON pre block", () => {
    const html = renderer.render({ foo: "bar" });
    expect(html).toContain("<pre>");
    expect(html).toContain("foo");
  });
});
