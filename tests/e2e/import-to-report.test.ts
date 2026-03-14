import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CreditMutuelImporter } from "../../src/infrastructure/bank/credit-mutuel.js";
import type Database from "better-sqlite3";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { Month } from "../../src/domain/value-object/month.js";
import { PlanBudget } from "../../src/application/usecase/plan-budget.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

describe("e2e: import → categorize → budget → report", () => {
  let tmpDir: string;
  let db: Database.Database;
  let importTxns: ImportTransactions;
  let planBudget: PlanBudget;
  let generateReport: GenerateReport;

  const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
  const month = Month.from("2026-03");

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-"));
    const { db: database, budgetRepo, txnRepo } = openDatabase(join(tmpDir, "test.db"));
    db = database;

    const importers = new Map([["credit-mutuel", new CreditMutuelImporter()]]);
    importTxns = new ImportTransactions(importers, txnRepo);
    planBudget = new PlanBudget(budgetRepo);
    generateReport = new GenerateReport(budgetRepo, txnRepo);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true });
  });

  it("imported transactions appear in the monthly report", () => {
    // 1. Parse & categorize
    const parsed = importTxns.parse("credit-mutuel", CSV);
    expect(parsed).toHaveLength(4);

    const categorized = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return { ...txn, categoryId: "n01" };
      }
      if (txn.label.includes("GROCERY")) {
        return { ...txn, categoryId: "n02" };
      }
      if (txn.label.includes("SALARY")) {
        return { ...txn, categoryId: "inc01" };
      }
      if (txn.label.includes("RESTAURANT")) {
        return { ...txn, categoryId: "w02" };
      }
      return txn;
    });

    // 2. Save
    importTxns.save(categorized);

    // 3. Budget
    const budget = planBudget.initFromDefaults(month);
    expect(budget.lines.length).toBeGreaterThan(0);

    // 4. Report
    const report = generateReport.execute(month);

    expect(report.transactionCount).toBe(4);
    let expectedNet = 0;
    for (const txn of parsed) {
      expectedNet += txn.amount.cents;
    }
    expect(report.net.cents).toBe(expectedNet);
    expect(report.totalIncomeActual.cents).toBe(250_000); // 2500€ salary
    expect(report.totalExpenseActual.cents).toBe(
      80_000 + 5230 + 3550, // rent + grocery + restaurant
    );
    expect(report.uncategorized.cents).toBe(0);
  });

  it("uncategorized transactions show up in uncategorized total", () => {
    const parsed = importTxns.parse("credit-mutuel", CSV);
    // save without categorizing
    importTxns.save(parsed);
    planBudget.initFromDefaults(month);

    const report = generateReport.execute(month);

    expect(report.transactionCount).toBe(4);
    expect(report.uncategorized.cents).toBe(80_000 + 5230 + 250_000 + 3550);
  });

  it("re-import preserves previously categorized transactions", () => {
    // First import: categorize only 2
    const parsed = importTxns.parse("credit-mutuel", CSV);
    const partial = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return { ...txn, categoryId: "n01" };
      }
      if (txn.label.includes("SALARY")) {
        return { ...txn, categoryId: "inc01" };
      }
      return txn;
    });
    importTxns.save(partial);

    // Re-import: split should detect already-categorized
    const reparsed = importTxns.parse("credit-mutuel", CSV);
    const { alreadyCategorized, uncategorized } = importTxns.splitByCategoryStatus(reparsed);

    expect(alreadyCategorized).toHaveLength(2);
    expect(uncategorized).toHaveLength(2);
    expect(alreadyCategorized.map((txn) => txn.categoryId).toSorted()).toEqual(["inc01", "n01"]);
  });
});
