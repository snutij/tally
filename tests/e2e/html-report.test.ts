import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CreditMutuelImporter } from "../../src/infrastructure/bank/credit-mutuel.js";
import type Database from "better-sqlite3";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { Month } from "../../src/domain/value-object/month.js";
import { PlanBudget } from "../../src/application/usecase/plan-budget.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

describe("e2e: HTML report output", () => {
  let tmpDir: string;
  let db: Database.Database;
  let importTxns: ImportTransactions;
  let planBudget: PlanBudget;
  let generateReport: GenerateReport;
  const renderer = new HtmlRenderer();

  const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
  const month = Month.from("2026-03");

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-html-"));
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

  it("renders a full report as valid HTML", () => {
    const parsed = importTxns.parse("credit-mutuel", CSV);
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
    importTxns.save(categorized);
    planBudget.initFromDefaults(month);

    const report = generateReport.execute(month);
    const html = renderer.render(report);

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Monthly Report");
    expect(html).toContain("Key Indicators");
    expect(html).toContain("Group Summary");
    expect(html).toContain("Category Breakdown");
    expect(html).toContain("€");
  });
});
