import { describe, expect, it } from "vitest";
import { CsvFormatDetectorImpl } from "../../../src/infrastructure/csv/csv-format-detector-impl.js";
import { join } from "node:path";

describe("CsvFormatDetectorImpl", () => {
  const detector = new CsvFormatDetectorImpl();

  it("reads file content from disk", () => {
    const csvPath = join(import.meta.dirname, "../../fixtures/credit-mutuel-sample.csv");
    const content = detector.readFileContent(csvPath);
    expect(content).toContain(";");
    expect(content.length).toBeGreaterThan(0);
  });

  it("detects delimiter in sample lines", () => {
    const result = detector.detectDelimiter(["a;b;c", "d;e;f"]);
    expect(result.value).toBe(";");
    expect(result.confident).toBe(true);
  });

  it("detects date format from samples", () => {
    const result = detector.detectDateFormat(["15/03/2026", "01/04/2026"]);
    expect(result.value).toBe("DD/MM/YYYY");
  });

  it("detects decimal separator from amount samples", () => {
    const result = detector.detectDecimalSeparator(["1.234,56", "2.000,00"]);
    expect(result.value).toBe(",");
  });
});
