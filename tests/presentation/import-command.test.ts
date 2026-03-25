import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import type { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { SeedMockData } from "../../src/application/usecase/seed-mock-data.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

vi.mock("../../src/presentation/prompt/column-mapping-prompt.js", () => ({
  collectColumnMapping: vi.fn(),
}));
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    fail: vi.fn(),
    info: vi.fn(),
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    warn: vi.fn(),
  })),
}));

import { collectColumnMapping } from "../../src/presentation/prompt/column-mapping-prompt.js";
import { createImportCommand } from "../../src/presentation/command/import-command.js";

const mockMappingConfig = {
  dateFormat: "DD/MM/YYYY",
  decimalSeparator: ".",
  delimiter: ";",
  fields: ["date", "label", "amount"],
};

// Transaction entity as returned by a parser (for mockParser.parse mock)
function parsedTxn(id = "t1"): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(-42),
    date: Temporal.PlainDate.from("2026-03-15"),
    id: TransactionId(id),
    label: "TEST",
    source: "csv",
  });
}

describe("createImportCommand", () => {
  const mockParser = { parse: vi.fn() };
  const mockSeedDemoData = { execute: vi.fn() };
  const mockImportCsvWorkflow = { execute: vi.fn() };
  const mockCsvFormatDetector = {};
  const mockCsvColumnMapper = { detectColumns: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };
  const mockDeps = {
    csvColumnMapper: mockCsvColumnMapper,
    csvFormatDetector: mockCsvFormatDetector,
    parserFactory: vi.fn().mockReturnValue(mockParser),
    renderer: mockRenderer,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(collectColumnMapping).mockResolvedValue(mockMappingConfig as never);
    mockImportCsvWorkflow.execute.mockResolvedValue({ savedCount: 0 });
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createImportCommand(
      mockSeedDemoData as unknown as SeedMockData,
      mockImportCsvWorkflow as unknown as ImportCsvWorkflow,
      mockDeps,
    );
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "import", ...args]);
  }

  describe("csv subcommand", () => {
    it("calls collectColumnMapping with file, detector, and csvColumnMapper", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);

      await run("csv", "file.csv");

      expect(collectColumnMapping).toHaveBeenCalledWith(
        "file.csv",
        mockCsvFormatDetector,
        mockDeps.csvColumnMapper,
      );
    });

    it("runs workflow and logs result", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportCsvWorkflow.execute.mockResolvedValue({ savedCount: 1 });

      await run("csv", "file.csv");

      expect(mockImportCsvWorkflow.execute).toHaveBeenCalledWith(
        expect.objectContaining({ transactions: expect.any(Array) }),
      );
    });

    it("calls onLlmCategorized callback", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportCsvWorkflow.execute.mockImplementation(
        (input: { onLlmCategorized?: (count: number) => void }) => {
          input.onLlmCategorized?.(3);
          return Promise.resolve({ savedCount: 3 });
        },
      );

      await run("csv", "file.csv");

      expect(mockImportCsvWorkflow.execute).toHaveBeenCalled();
    });

    it("calls onUncategorized callback", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportCsvWorkflow.execute.mockImplementation(
        (input: { onUncategorized?: (txns: { label: string; date: string }[]) => void }) => {
          input.onUncategorized?.([
            { date: "2026-02-01", label: "UNKNOWN MERCHANT" },
            { date: "2026-02-15", label: "MYSTERY SHOP" },
          ]);
          return Promise.resolve({ savedCount: 0 });
        },
      );

      await run("csv", "file.csv");

      expect(mockImportCsvWorkflow.execute).toHaveBeenCalled();
    });

    it("displays auto-categorization summary when rules match", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportCsvWorkflow.execute.mockImplementation(
        (input: { onAutoMatched?: (matched: number, total: number) => void }) => {
          input.onAutoMatched?.(1, 1);
          return Promise.resolve({ savedCount: 1 });
        },
      );

      await run("csv", "file.csv");

      expect(mockImportCsvWorkflow.execute).toHaveBeenCalled();
    });

    it("calls onInvalidCategoryIds callback", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportCsvWorkflow.execute.mockImplementation(
        (input: { onInvalidCategoryIds?: (count: number) => void }) => {
          input.onInvalidCategoryIds?.(2);
          return Promise.resolve({ savedCount: 0 });
        },
      );

      await run("csv", "file.csv");

      expect(mockImportCsvWorkflow.execute).toHaveBeenCalled();
    });

    it("rethrows when workflow fails and calls spinner.fail", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportCsvWorkflow.execute.mockRejectedValue(new Error("workflow error"));

      await expect(run("csv", "file.csv")).rejects.toThrow("workflow error");
    });

    it("skips already-categorized transactions and logs count", async () => {
      mockParser.parse.mockReturnValue([parsedTxn("t1"), parsedTxn("t2")]);
      mockImportCsvWorkflow.execute.mockImplementation(
        (input: { onAlreadyCategorized?: (count: number) => void }) => {
          input.onAlreadyCategorized?.(1);
          return Promise.resolve({ savedCount: 2 });
        },
      );

      await run("csv", "file.csv");

      expect(mockImportCsvWorkflow.execute).toHaveBeenCalled();
    });
  });

  describe("demo subcommand", () => {
    it("seeds all demo months and logs total count", async () => {
      mockSeedDemoData.execute.mockReturnValue({ transactionCount: 20 });
      await run("demo");
      expect(mockSeedDemoData.execute).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });
  });
});
