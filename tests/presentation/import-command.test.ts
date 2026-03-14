import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";

vi.mock("../../src/presentation/prompt/categorize-prompt.js", () => ({
  categorizePrompt: vi.fn(),
}));
vi.mock("../../src/presentation/prompt/column-mapping-prompt.js", () => ({
  collectColumnMapping: vi.fn(),
}));
vi.mock("../../src/infrastructure/csv/csv-transaction-parser.js", () => ({
  CsvTransactionParser: vi.fn(),
}));

import { categorizePrompt } from "../../src/presentation/prompt/categorize-prompt.js";
import { collectColumnMapping } from "../../src/presentation/prompt/column-mapping-prompt.js";
import { createImportCommand } from "../../src/presentation/command/import-command.js";

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    amount: Money.fromEuros(-42),
    date: DateOnly.from("2026-03-15"),
    id: "t1",
    label: "TEST",
    source: "csv",
    ...overrides,
  };
}

describe("createImportCommand", () => {
  const mockImportTransactions = {
    parse: vi.fn(),
    save: vi.fn(),
    splitByCategoryStatus: vi.fn(),
  };
  const mockSeedMockData = { execute: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(collectColumnMapping).mockResolvedValue({} as never);
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createImportCommand(mockImportTransactions, mockSeedMockData, mockRenderer);
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
      const parsed = [txn()];
      mockImportTransactions.parse.mockReturnValue(parsed);
      mockImportTransactions.save.mockReturnValue({ count: 1 });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv", "--no-categorize");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(collectColumnMapping).toHaveBeenCalledWith("file.csv");
      expect(mockImportTransactions.parse).toHaveBeenCalled();
      expect(mockImportTransactions.save).toHaveBeenCalledWith(parsed);
    });

    it("with TTY prompts for categorization", async () => {
      const parsed = [txn()];
      mockImportTransactions.parse.mockReturnValue(parsed);
      mockImportTransactions.splitByCategoryStatus.mockReturnValue({
        alreadyCategorized: [],
        uncategorized: parsed,
      });
      vi.mocked(categorizePrompt).mockResolvedValue({
        categorized: [{ ...parsed[0], categoryId: "n01" }],
        interrupted: false,
      });
      mockImportTransactions.save.mockReturnValue({ count: 1 });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(categorizePrompt).toHaveBeenCalledWith(parsed);
      expect(mockImportTransactions.save).toHaveBeenCalled();
    });

    it("handles interruption", async () => {
      const parsed = [txn(), txn({ id: "t2" })];
      mockImportTransactions.parse.mockReturnValue(parsed);
      mockImportTransactions.splitByCategoryStatus.mockReturnValue({
        alreadyCategorized: [],
        uncategorized: parsed,
      });
      vi.mocked(categorizePrompt).mockResolvedValue({
        categorized: [{ ...parsed[0], categoryId: "n01" }],
        interrupted: true,
      });
      mockImportTransactions.save.mockReturnValue({ count: 1 });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Interrupted"));
    });

    it("skips already-categorized transactions and logs count", async () => {
      const t1 = txn({ categoryId: "n01", id: "t1" });
      const t2 = txn({ id: "t2" });
      mockImportTransactions.parse.mockReturnValue([t1, t2]);
      mockImportTransactions.splitByCategoryStatus.mockReturnValue({
        alreadyCategorized: [t1],
        uncategorized: [t2],
      });
      vi.mocked(categorizePrompt).mockResolvedValue({
        categorized: [{ ...t2, categoryId: "n02" }],
        interrupted: false,
      });
      mockImportTransactions.save.mockReturnValue({ count: 2 });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(console.log).toHaveBeenCalledWith("Skipping 1 already-categorized transactions.");
    });
  });

  describe("mock subcommand", () => {
    it("seeds data with explicit month", async () => {
      mockSeedMockData.execute.mockReturnValue({ budgetCreated: true, transactionCount: 17 });
      await run("mock", "2026-03");
      expect(mockSeedMockData.execute).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    it("defaults to current month", async () => {
      mockSeedMockData.execute.mockReturnValue({ budgetCreated: true, transactionCount: 17 });
      await run("mock");
      expect(mockSeedMockData.execute).toHaveBeenCalled();
    });
  });
});
