import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";

import type { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import type { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { SeedMockData } from "../../src/application/usecase/seed-mock-data.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

vi.mock("../../src/presentation/prompt/categorize-prompt.js", () => ({
  categorizePrompt: vi.fn(),
}));
vi.mock("../../src/presentation/prompt/column-mapping-prompt.js", () => ({
  collectColumnMapping: vi.fn(),
}));
import { categorizePrompt } from "../../src/presentation/prompt/categorize-prompt.js";
import { collectColumnMapping } from "../../src/presentation/prompt/column-mapping-prompt.js";
import { createImportCommand } from "../../src/presentation/command/import-command.js";

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
  const mockImportTransactions = { save: vi.fn() };
  const mockSeedMockData = { execute: vi.fn() };
  const mockImportCsvWorkflow = { execute: vi.fn() };
  const mockCsvFormatDetector = {};
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };
  const mockDeps = {
    choiceGroups: [],
    csvFormatDetector: mockCsvFormatDetector,
    parserFactory: vi.fn().mockReturnValue(mockParser),
    renderer: mockRenderer,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(collectColumnMapping).mockResolvedValue({} as never);
    mockImportCsvWorkflow.execute.mockResolvedValue({ interrupted: false, savedCount: 0 });
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createImportCommand(
      mockImportTransactions as unknown as ImportTransactions,
      mockSeedMockData as unknown as SeedMockData,
      mockImportCsvWorkflow as unknown as ImportCsvWorkflow,
      mockDeps,
    );
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "import", ...args]);
  }

  describe("csv subcommand", () => {
    it("exits with error when not a TTY", async () => {
      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = false;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }
      expect(console.error).toHaveBeenCalledWith("Interactive mapping requires a TTY.");
      expect(process.exitCode).toBe(1);
      process.exitCode = 0;
    });

    it("with --no-categorize saves directly", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportTransactions.save.mockReturnValue({ count: 1 });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv", "--no-categorize");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(collectColumnMapping).toHaveBeenCalledWith("file.csv", mockCsvFormatDetector);
      expect(mockParser.parse).toHaveBeenCalled();
      expect(mockImportTransactions.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ amount: -42, id: "t1" })]),
      );
    });

    it("with TTY prompts for categorization via workflow", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      vi.mocked(categorizePrompt).mockResolvedValue({ categorized: [], interrupted: false });
      mockImportCsvWorkflow.execute.mockImplementation(
        async (input: { promptFn?: (txns: never[]) => unknown }) => {
          await input.promptFn?.([]);
          return { interrupted: false, savedCount: 1 };
        },
      );

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(mockImportCsvWorkflow.execute).toHaveBeenCalledWith(
        expect.objectContaining({ transactions: expect.any(Array) }),
      );
      expect(categorizePrompt).toHaveBeenCalledWith([], []);
    });

    it("handles interruption", async () => {
      mockParser.parse.mockReturnValue([parsedTxn(), parsedTxn("t2")]);
      mockImportCsvWorkflow.execute.mockResolvedValue({ interrupted: true, savedCount: 1 });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Interrupted"));
    });

    it("displays auto-categorization summary when rules match", async () => {
      mockParser.parse.mockReturnValue([parsedTxn()]);
      mockImportCsvWorkflow.execute.mockImplementation((input) => {
        input.onAutoMatched?.(1, 1);
        return Promise.resolve({ interrupted: false, savedCount: 1 });
      });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(console.log).toHaveBeenCalledWith("Auto-categorized 1 of 1 transactions.");
    });

    it("skips already-categorized transactions and logs count", async () => {
      mockParser.parse.mockReturnValue([parsedTxn("t1"), parsedTxn("t2")]);
      mockImportCsvWorkflow.execute.mockImplementation((input) => {
        input.onAlreadyCategorized?.(1);
        return Promise.resolve({ interrupted: false, savedCount: 2 });
      });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(console.log).toHaveBeenCalledWith("Skipping 1 already-categorized transactions.");
    });

    it("propagates ExitPromptError from column mapping (handled at top-level)", async () => {
      class MockExitPromptError extends Error {}
      vi.mocked(collectColumnMapping).mockRejectedValue(new MockExitPromptError("sigint"));

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await expect(run("csv", "file.csv")).rejects.toBeInstanceOf(MockExitPromptError);
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }
    });
  });

  describe("mock subcommand", () => {
    it("seeds data with explicit month", async () => {
      mockSeedMockData.execute.mockReturnValue({ transactionCount: 17 });
      await run("mock", "2026-03");
      expect(mockSeedMockData.execute).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    it("defaults to current month", async () => {
      mockSeedMockData.execute.mockReturnValue({ transactionCount: 17 });
      await run("mock");
      expect(mockSeedMockData.execute).toHaveBeenCalled();
    });
  });
});
