import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CsvColumnMapping } from "../../src/infrastructure/csv/csv-column-mapping.js";
import { CsvTransactionParser } from "../../src/infrastructure/csv/csv-transaction-parser.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";
import { toTransactionDto } from "../../src/application/dto/transaction-dto.js";

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
  const parser = new CsvTransactionParser(CSV_MAPPING);

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-"));
    const registry = new CategoryRegistry(DEFAULT_CATEGORIES);
    const { close: closeDb, txnRepository } = openDatabase(
      join(tmpDir, "test.db"),
      registry,
      new Sha256IdGenerator(),
    );
    close = closeDb;

    importTxns = new ImportTransactions(txnRepository);
    generateReport = new GenerateReport(txnRepository, registry);
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("imported transactions appear in the monthly report without a budget step", () => {
    const parsed = parser.parse(CSV);
    expect(parsed).toHaveLength(4);

    const categorized = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return toTransactionDto(txn.categorize(CategoryId("n01")));
      }
      if (txn.label.includes("GROCERY")) {
        return toTransactionDto(txn.categorize(CategoryId("n02")));
      }
      if (txn.label.includes("SALARY")) {
        return toTransactionDto(txn.categorize(CategoryId("inc01")));
      }
      if (txn.label.includes("RESTAURANT")) {
        return toTransactionDto(txn.categorize(CategoryId("w02")));
      }
      return toTransactionDto(txn);
    });

    importTxns.save(categorized);

    // No budget.init step — report works directly
    const report = generateReport.execute("2026-03");

    expect(report.transactionCount).toBe(4);
    let expectedNet = 0;
    for (const txn of parsed) {
      expectedNet += txn.amount.toEuros();
    }
    expect(report.net).toBeCloseTo(expectedNet, 2);
    expect(report.totalIncomeActual).toBe(2500); // 2500€ salary
    expect(report.totalExpenseActual).toBeCloseTo(800 + 52.3 + 35.5, 1); // rent + grocery + restaurant
    expect(report.uncategorized).toBe(0);
  });

  it("group targets computed from actual income (50/30/20)", () => {
    const parsed = parser.parse(CSV);
    const withSalary = parsed.map((txn) =>
      toTransactionDto(txn.label.includes("SALARY") ? txn.categorize(CategoryId("inc01")) : txn),
    );
    importTxns.save(withSalary);

    const report = generateReport.execute("2026-03");
    const needs = report.groups.find((grp) => grp.group === "NEEDS");
    expect(needs?.budgeted).toBeCloseTo((2500 * DEFAULT_SPENDING_TARGETS.needs) / 100, 2);
  });

  it("uncategorized transactions show up in uncategorized total", () => {
    const parsed = parser.parse(CSV);
    importTxns.save(parsed.map((txn) => toTransactionDto(txn)));

    const report = generateReport.execute("2026-03");

    expect(report.transactionCount).toBe(4);
    expect(report.uncategorized).toBeCloseTo(800 + 52.3 + 2500 + 35.5, 1);
  });

  it("re-import preserves previously categorized transactions", () => {
    const parsed = parser.parse(CSV);
    const partial = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return toTransactionDto(txn.categorize(CategoryId("n01")));
      }
      if (txn.label.includes("SALARY")) {
        return toTransactionDto(txn.categorize(CategoryId("inc01")));
      }
      return toTransactionDto(txn);
    });
    importTxns.save(partial);

    const reparsed = parser.parse(CSV).map((txn) => toTransactionDto(txn));
    const { alreadyCategorized, uncategorized } = importTxns.splitByCategoryStatus(reparsed);

    expect(alreadyCategorized).toHaveLength(2);
    expect(uncategorized).toHaveLength(2);
    expect(alreadyCategorized.map((txn) => txn.categoryId).toSorted()).toEqual(["inc01", "n01"]);
  });
});
