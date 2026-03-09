import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { PlanBudget } from "../../src/application/usecase/plan-budget.js";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { CreditMutuelImporter } from "../../src/infrastructure/bank/credit-mutuel.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("e2e: import → categorize → budget → report", () => {
  let tmpDir: string;
  let db: Database.Database;
  let importTxns: ImportTransactions;
  let planBudget: PlanBudget;
  let generateReport: GenerateReport;

  const CSV = join(__dirname, "../fixtures/credit-mutuel-sample.csv");
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

    const categorized = parsed.map((t) => {
      if (t.label.includes("RENT")) return { ...t, categoryId: "n01" };
      if (t.label.includes("GROCERY")) return { ...t, categoryId: "n02" };
      if (t.label.includes("SALARY")) return { ...t, categoryId: "inc01" };
      if (t.label.includes("RESTAURANT")) return { ...t, categoryId: "w02" };
      return t;
    });

    // 2. Save
    importTxns.save(categorized);

    // 3. Budget
    const budget = planBudget.initFromDefaults(month);
    expect(budget.lines.length).toBeGreaterThan(0);

    // 4. Report
    const report = generateReport.execute(month);

    expect(report.transactionCount).toBe(4);
    expect(report.net.cents).toBe(
      parsed.reduce((sum, t) => sum + t.amount.cents, 0),
    );
    expect(report.totalIncomeActual.cents).toBe(250000); // 2500€ salary
    expect(report.totalExpenseActual.cents).toBe(
      80000 + 5230 + 3550, // rent + grocery + restaurant
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
    expect(report.uncategorized.cents).toBe(
      80000 + 5230 + 250000 + 3550,
    );
  });

  it("re-import preserves previously categorized transactions", () => {
    // First import: categorize only 2
    const parsed = importTxns.parse("credit-mutuel", CSV);
    const partial = parsed.map((t) => {
      if (t.label.includes("RENT")) return { ...t, categoryId: "n01" };
      if (t.label.includes("SALARY")) return { ...t, categoryId: "inc01" };
      return t;
    });
    importTxns.save(partial);

    // Re-import: split should detect already-categorized
    const reparsed = importTxns.parse("credit-mutuel", CSV);
    const { alreadyCategorized, uncategorized } =
      importTxns.splitByCategoryStatus(reparsed);

    expect(alreadyCategorized).toHaveLength(2);
    expect(uncategorized).toHaveLength(2);
    expect(alreadyCategorized.map((t) => t.categoryId).sort()).toEqual(["inc01", "n01"]);
  });
});
