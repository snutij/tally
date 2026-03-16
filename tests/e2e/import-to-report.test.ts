import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CsvColumnMapping } from "../../src/infrastructure/csv/csv-column-mapping.js";
import { CsvTransactionParser } from "../../src/infrastructure/csv/csv-transaction-parser.js";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
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

describe("e2e: import → report (no budget step)", () => {
  let tmpDir: string;
  let close: () => void;
  let importTxns: ImportTransactions;
  let generateReport: GenerateReport;

  const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
  const month = Month.from("2026-03");
  const parser = new CsvTransactionParser(CSV_MAPPING);

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-"));
    const { close: closeDb, txnRepo } = openDatabase(join(tmpDir, "test.db"));
    close = closeDb;

    importTxns = new ImportTransactions(txnRepo);
    generateReport = new GenerateReport(txnRepo);
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("imported transactions appear in the monthly report without a budget step", () => {
    const parsed = importTxns.parse(parser, CSV);
    expect(parsed).toHaveLength(4);

    const categorized = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return txn.categorize(CategoryId("n01"));
      }
      if (txn.label.includes("GROCERY")) {
        return txn.categorize(CategoryId("n02"));
      }
      if (txn.label.includes("SALARY")) {
        return txn.categorize(CategoryId("inc01"));
      }
      if (txn.label.includes("RESTAURANT")) {
        return txn.categorize(CategoryId("w02"));
      }
      return txn;
    });

    importTxns.save(categorized);

    // No budget.init step — report works directly
    const report = generateReport.execute(month);

    expect(report.transactionCount).toBe(4);
    let expectedNet = 0;
    for (const txn of parsed) {
      expectedNet += txn.amount.cents;
    }
    expect(report.net.cents).toBe(expectedNet);
    expect(report.totalIncomeActual.cents).toBe(250_000); // 2500€ salary
    expect(report.totalExpenseActual.cents).toBe(80_000 + 5230 + 3550); // rent + grocery + restaurant
    expect(report.uncategorized.cents).toBe(0);
  });

  it("group targets computed from actual income (50/30/20)", () => {
    const parsed = importTxns.parse(parser, CSV);
    const withSalary = parsed.map((txn) =>
      txn.label.includes("SALARY") ? txn.categorize(CategoryId("inc01")) : txn,
    );
    importTxns.save(withSalary);

    const report = generateReport.execute(month);
    const needs = report.groups.find((grp) => grp.group === "NEEDS");
    expect(needs?.budgeted.cents).toBe(
      Math.round((250_000 * DEFAULT_SPENDING_TARGETS.needs) / 100),
    );
  });

  it("uncategorized transactions show up in uncategorized total", () => {
    const parsed = importTxns.parse(parser, CSV);
    importTxns.save(parsed);

    const report = generateReport.execute(month);

    expect(report.transactionCount).toBe(4);
    expect(report.uncategorized.cents).toBe(80_000 + 5230 + 250_000 + 3550);
  });

  it("re-import preserves previously categorized transactions", () => {
    const parsed = importTxns.parse(parser, CSV);
    const partial = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return txn.categorize(CategoryId("n01"));
      }
      if (txn.label.includes("SALARY")) {
        return txn.categorize(CategoryId("inc01"));
      }
      return txn;
    });
    importTxns.save(partial);

    const reparsed = importTxns.parse(parser, CSV);
    const { alreadyCategorized, uncategorized } = importTxns.splitByCategoryStatus(reparsed);

    expect(alreadyCategorized).toHaveLength(2);
    expect(uncategorized).toHaveLength(2);
    expect(alreadyCategorized.map((txn) => txn.categoryId).toSorted()).toEqual(["inc01", "n01"]);
  });
});
