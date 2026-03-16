import { describe, expect, it } from "vitest";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import { Transaction } from "../../src/domain/entity/transaction.js";

const targets = DEFAULT_SPENDING_TARGETS;

function makeTxn(id: string, amount: number, date: string, categoryId?: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(amount),
    categoryId,
    date: DateOnly.from(date),
    id,
    label: `txn-${id}`,
    source: "csv",
  });
}

const txns = [makeTxn("1", 3000, "2026-03-01", "inc01"), makeTxn("2", -750, "2026-03-02", "n01")];

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
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, [
        makeTxn("1", -200, "2026-03-05"),
      ]);
      const html = renderer.render(report);
      const [, body] = html.split("<body>");
      expect(body).toContain("Largest Expenses");
      expect(body).not.toContain("Top Spending");
    });

    it("shows top spending but no largest expenses when only refunds", () => {
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, [
        makeTxn("1", 100, "2026-03-05", "n01"),
      ]);
      const html = renderer.render(report);
      const [, body] = html.split("<body>");
      expect(body).toContain("Top Spending");
      expect(body).not.toContain("Largest Expenses");
    });
  });

  describe("render(MonthlyReport) — uncategorized", () => {
    it("shows uncategorized section when non-zero", () => {
      const report = MonthlyReport.compute(Month.from("2026-03"), targets, [
        makeTxn("3", -100, "2026-03-05"),
      ]);
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
