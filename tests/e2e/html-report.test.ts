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
import { Month } from "../../src/domain/value-object/month.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";

describe("e2e: HTML report output", () => {
  let tmpDir: string;
  let db: Database.Database;
  let importTxns: ImportTransactions;
  let planBudget: PlanBudget;
  let generateReport: GenerateReport;
  const renderer = new HtmlRenderer();

  const CSV = join(__dirname, "../fixtures/credit-mutuel-sample.csv");
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
    const categorized = parsed.map((t) => {
      if (t.label.includes("RENT")) return { ...t, categoryId: "n01" };
      if (t.label.includes("GROCERY")) return { ...t, categoryId: "n02" };
      if (t.label.includes("SALARY")) return { ...t, categoryId: "inc01" };
      if (t.label.includes("RESTAURANT")) return { ...t, categoryId: "w02" };
      return t;
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
