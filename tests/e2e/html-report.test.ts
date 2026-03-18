import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CsvColumnMapping } from "../../src/infrastructure/csv/csv-column-mapping.js";
import { CsvTransactionParser } from "../../src/infrastructure/csv/csv-transaction-parser.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
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

describe("e2e: HTML report output", () => {
  let tmpDir: string;
  let close: () => void;
  let importTxns: ImportTransactions;
  let generateReport: GenerateReport;
  const renderer = new HtmlRenderer();

  const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
  const parser = new CsvTransactionParser(CSV_MAPPING);

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-html-"));
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

  it("renders a full report as valid HTML (no budget init step)", () => {
    const parsed = parser.parse(CSV);
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

    const report = generateReport.execute("2026-03");
    const html = renderer.render(report);

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Monthly Report");
    expect(html).toContain("Key Indicators");
    expect(html).toContain("Group Summary");
    expect(html).not.toContain("Category Breakdown");
    expect(html).toContain("€");
  });
});
