import { describe, expect, it, vi } from "vitest";
import { ApplicationError } from "../../src/application/error.js";
import type { CsvColumnMapper } from "../../src/application/gateway/csv-column-mapper.js";
import type { CsvFormatDetector } from "../../src/application/gateway/csv-format-detector.js";
import { collectColumnMapping } from "../../src/presentation/prompt/column-mapping-prompt.js";

function makeDetector(overrides: Partial<CsvFormatDetector> = {}): CsvFormatDetector {
  return {
    detectDateFormat: vi.fn().mockReturnValue({ confident: true, value: "DD/MM/YYYY" }),
    detectDecimalSeparator: vi.fn().mockReturnValue({ confident: true, value: "," }),
    detectDelimiter: vi.fn().mockReturnValue({ confident: true, value: ";" }),
    readFileContent: vi
      .fn()
      .mockReturnValue("Date;Libellé;Montant\n15/03/2026;CARREFOUR;-42,90\n16/03/2026;SNCF;-25,00"),
    ...overrides,
  };
}

function makeMapper(fields = ["date", "label", "amount"]): CsvColumnMapper {
  return {
    detectColumns: vi.fn().mockResolvedValue(fields),
  };
}

describe("collectColumnMapping", () => {
  it("returns mapping config on successful detection", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const detector = makeDetector();
    const mapper = makeMapper();

    const result = await collectColumnMapping("bank.csv", detector, mapper);

    expect(result.fields).toEqual(["date", "label", "amount"]);
    expect(result.delimiter).toBe(";");
    expect(result.dateFormat).toBe("DD/MM/YYYY");
    expect(result.decimalSeparator).toBe(",");
  });

  it("throws ApplicationError when delimiter is ambiguous", async () => {
    const detector = makeDetector({
      detectDelimiter: vi.fn().mockReturnValue({ confident: false, value: ";" }),
    });
    const mapper = makeMapper();

    await expect(collectColumnMapping("bank.csv", detector, mapper)).rejects.toThrow(
      ApplicationError,
    );
  });

  it("defaults date format to DD/MM/YYYY when detection is not confident", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const detector = makeDetector({
      detectDateFormat: vi.fn().mockReturnValue({ confident: false, value: "MM/DD/YYYY" }),
    });
    const mapper = makeMapper();

    const result = await collectColumnMapping("bank.csv", detector, mapper);

    expect(result.dateFormat).toBe("DD/MM/YYYY");
  });

  it("throws ApplicationError when headers are missing", async () => {
    const detector = makeDetector({
      readFileContent: vi.fn().mockReturnValue(""),
    });
    const mapper = makeMapper();

    await expect(collectColumnMapping("bank.csv", detector, mapper)).rejects.toThrow(
      ApplicationError,
    );
  });
});
