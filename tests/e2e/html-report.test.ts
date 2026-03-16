import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CsvColumnMapping } from "../../src/infrastructure/csv/csv-column-mapping.js";
import { CsvTransactionParser } from "../../src/infrastructure/csv/csv-transaction-parser.js";
import type Database from "better-sqlite3";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { Month } from "../../src/domain/value-object/month.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

// credit-mutuel-sample.csv: Date;Date de valeur;Montant;Libellé;Solde
const CSV_MAPPING = new CsvColumnMapping({
  dateFormat: "DD/MM/YYYY",
  decimalSeparator: ",",
  delimiter: ";",
  fields: ["date", "ignore", "amount", "label", "ignore"],
});

describe("e2e: HTML report output", () => {
  let tmpDir: string;
  let db: Database.Database;
  let importTxns: ImportTransactions;
  let generateReport: GenerateReport;
  const renderer = new HtmlRenderer();

  const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
  const month = Month.from("2026-03");
  const parser = new CsvTransactionParser(CSV_MAPPING);

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-html-"));
    const { db: database, txnRepo } = openDatabase(join(tmpDir, "test.db"));
    db = database;

    importTxns = new ImportTransactions(txnRepo);
    generateReport = new GenerateReport(txnRepo);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true });
  });

  it("renders a full report as valid HTML (no budget init step)", () => {
    const parsed = importTxns.parse(parser, CSV);
    const categorized = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return txn.categorize(CategoryId.from("n01"));
      }
      if (txn.label.includes("GROCERY")) {
        return txn.categorize(CategoryId.from("n02"));
      }
      if (txn.label.includes("SALARY")) {
        return txn.categorize(CategoryId.from("inc01"));
      }
      if (txn.label.includes("RESTAURANT")) {
        return txn.categorize(CategoryId.from("w02"));
      }
      return txn;
    });
    importTxns.save(categorized);

    const report = generateReport.execute(month);
    const html = renderer.render(report);

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Monthly Report");
    expect(html).toContain("Key Indicators");
    expect(html).toContain("Group Summary");
    expect(html).not.toContain("Category Breakdown");
    expect(html).toContain("€");
  });
});
