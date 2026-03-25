import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CsvColumnMapping } from "../../src/infrastructure/csv/csv-column-mapping.js";
import { CsvTransactionParser } from "../../src/infrastructure/csv/csv-transaction-parser.js";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { JsonRenderer } from "../../src/presentation/renderer/json-renderer.js";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";
import { toTransactionDto } from "../../src/application/dto/transaction-dto.js";

const CSV_MAPPING = new CsvColumnMapping({
  dateFormat: "DD/MM/YYYY",
  decimalSeparator: ",",
  delimiter: ";",
  fields: ["date", "ignore", "amount", "label", "ignore"],
});

describe("e2e: report", () => {
  let tmpDir: string;
  let close: () => void;
  let importTxns: ImportTransactions;
  let generateReport: GenerateReport;

  const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
  const parser = new CsvTransactionParser(CSV_MAPPING);

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-e2e-report-"));
    const {
      close: closeDb,
      txnRepository,
      categoryRepository,
    } = openDatabase(join(tmpDir, "test.db"), new Sha256IdGenerator());
    close = closeDb;

    const registry = new CategoryRegistry(categoryRepository.findAll());
    importTxns = new ImportTransactions(txnRepository);
    generateReport = new GenerateReport(txnRepository, registry);
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("returns empty report with no data", () => {
    const result = generateReport.execute();
    expect(result._type).toBe("ReportDto");
    expect(result.months).toHaveLength(0);
    expect(result.range).toBeNull();
    expect(result.trend).toBeNull();
  });

  it("loads all transactions from CSV into a single-month report", () => {
    const parsed = parser.parse(CSV);
    const categorized = parsed.map((txn) => {
      if (txn.label.includes("RENT")) {
        return toTransactionDto(txn.categorize(CategoryId("n01")));
      }
      if (txn.label.includes("SALARY")) {
        return toTransactionDto(txn.categorize(CategoryId("inc01")));
      }
      return toTransactionDto(txn);
    });
    importTxns.save(categorized);

    const result = generateReport.execute();
    expect(result.months).toHaveLength(1);
    expect(result.range?.start).toBe("2026-03");
    expect(result.range?.end).toBe("2026-03");
    expect(result.trend).toBeNull();
    expect(result.months[0]?.transactionCount).toBe(4);
  });

  it("JSON output omits _type and includes months + range", () => {
    const parsed = parser.parse(CSV);
    importTxns.save(parsed.map((txn) => toTransactionDto(txn)));

    const result = generateReport.execute();
    const json = JSON.parse(new JsonRenderer().render(result));

    expect("_type" in json).toBe(false);
    expect(json.range).toBeDefined();
    expect(json.months).toHaveLength(1);
    expect(json.trend).toBeNull();
  });

  it("HTML output is valid for single-month report", () => {
    const parsed = parser.parse(CSV);
    importTxns.save(
      parsed.map((txn) =>
        txn.label.includes("SALARY")
          ? toTransactionDto(txn.categorize(CategoryId("inc01")))
          : toTransactionDto(txn),
      ),
    );

    const result = generateReport.execute();
    const html = new HtmlRenderer().render(result);

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Financial Report");
    expect(html).toContain("Key Indicators");
    expect(html).toContain("Group Summary");
    expect(html).toContain("€");
    expect(html).not.toContain('id="month-from"');
  });
});
