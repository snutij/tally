import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CsvColumnMapping } from "../../src/infrastructure/csv/csv-column-mapping.js";
import { CsvTransactionParser } from "../../src/infrastructure/csv/csv-transaction-parser.js";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { GenerateUnifiedReport } from "../../src/application/usecase/generate-unified-report.js";
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
  let generateReport: GenerateUnifiedReport;

  const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
  const parser = new CsvTransactionParser(CSV_MAPPING);

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-"));
    const {
      close: closeDb,
      txnRepository,
      categoryRepository,
    } = openDatabase(join(tmpDir, "test.db"), new Sha256IdGenerator());
    close = closeDb;

    const registry = new CategoryRegistry(categoryRepository.findAll());
    importTxns = new ImportTransactions(txnRepository);
    generateReport = new GenerateUnifiedReport(txnRepository, registry);
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

    const result = generateReport.execute();
    expect(result.months).toHaveLength(1);
    const month = result.months.at(0) as (typeof result.months)[0];

    expect(month.transactionCount).toBe(4);
    let expectedNet = 0;
    for (const txn of parsed) {
      expectedNet += txn.amount.toEuros();
    }
    expect(month.net).toBeCloseTo(expectedNet, 2);
    expect(month.totalIncomeActual).toBe(2500); // 2500€ salary
    expect(month.totalExpenseActual).toBeCloseTo(800 + 52.3 + 35.5, 1); // rent + grocery + restaurant
    expect(month.uncategorized).toBe(0);
  });

  it("group targets computed from actual income (50/30/20)", () => {
    const parsed = parser.parse(CSV);
    const withSalary = parsed.map((txn) =>
      toTransactionDto(txn.label.includes("SALARY") ? txn.categorize(CategoryId("inc01")) : txn),
    );
    importTxns.save(withSalary);

    const result = generateReport.execute();
    const month = result.months.at(0) as (typeof result.months)[0];
    const needs = month.groups.find((grp) => grp.group === "NEEDS");
    expect(needs?.budgeted).toBeCloseTo((2500 * DEFAULT_SPENDING_TARGETS.needs) / 100, 2);
  });

  it("uncategorized transactions show up in uncategorized total", () => {
    const parsed = parser.parse(CSV);
    importTxns.save(parsed.map((txn) => toTransactionDto(txn)));

    const result = generateReport.execute();
    const month = result.months.at(0) as (typeof result.months)[0];

    expect(month.transactionCount).toBe(4);
    expect(month.uncategorized).toBeCloseTo(800 + 52.3 + 2500 + 35.5, 1);
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
