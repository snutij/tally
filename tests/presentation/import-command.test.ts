import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { Command } from "commander";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import type { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import type { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
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

function txn(overrides: { id?: string; categoryId?: string } = {}): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(-42),
    categoryId: overrides.categoryId ? CategoryId(overrides.categoryId) : undefined,
    date: DateOnly.from("2026-03-15"),
    id: TransactionId(overrides.id ?? "t1"),
    label: "TEST",
    source: "csv",
  });
}

describe("createImportCommand", () => {
  const mockParser = { parse: vi.fn() };
  const mockImportTransactions = {
    save: vi.fn(),
    splitByCategoryStatus: vi.fn(),
  };
  const mockSeedMockData = { execute: vi.fn() };
  const mockApplyCategoryRules = {
    apply: vi.fn(() => ({ matched: [], unmatched: [] })),
  };
  const mockLearnCategoryRules = { learn: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };
  const mockDeps = {
    parserFactory: vi.fn().mockReturnValue(mockParser),
    renderer: mockRenderer,
    unitOfWork: { runInTransaction: vi.fn((fn: () => void) => fn()) },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(collectColumnMapping).mockResolvedValue({} as never);
    // Default: no auto-categorization matches
    mockApplyCategoryRules.apply.mockReturnValue({ matched: [], unmatched: [] });
    mockLearnCategoryRules.learn.mockReset();
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createImportCommand(
      mockImportTransactions as unknown as ImportTransactions,
      mockSeedMockData as unknown as SeedMockData,
      mockApplyCategoryRules as unknown as ApplyCategoryRules,
      mockLearnCategoryRules as unknown as LearnCategoryRules,
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
      const parsed = [txn()];
      mockParser.parse.mockReturnValue(parsed);
      mockImportTransactions.save.mockReturnValue({ count: 1 });

      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        await run("csv", "file.csv", "--no-categorize");
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }

      expect(collectColumnMapping).toHaveBeenCalledWith("file.csv");
      expect(mockParser.parse).toHaveBeenCalled();
      expect(mockImportTransactions.save).toHaveBeenCalledWith(parsed);
    });

    it("with TTY prompts for categorization", async () => {
      const base = txn();
      const parsed = [base];
      mockParser.parse.mockReturnValue(parsed);
      mockImportTransactions.splitByCategoryStatus.mockReturnValue({
        alreadyCategorized: [],
        uncategorized: parsed,
      });
      // apply returns all as unmatched → prompt receives them
      mockApplyCategoryRules.apply.mockReturnValue({ matched: [], unmatched: parsed });
      vi.mocked(categorizePrompt).mockResolvedValue({
        categorized: [base.categorize(CategoryId("n01"))],
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
      const base = txn();
      const parsed = [base, txn({ id: "t2" })];
      mockParser.parse.mockReturnValue(parsed);
      mockImportTransactions.splitByCategoryStatus.mockReturnValue({
        alreadyCategorized: [],
        uncategorized: parsed,
      });
      mockApplyCategoryRules.apply.mockReturnValue({ matched: [], unmatched: parsed });
      vi.mocked(categorizePrompt).mockResolvedValue({
        categorized: [base.categorize(CategoryId("n01"))],
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

    it("displays auto-categorization summary when rules match", async () => {
      const base = txn();
      const matched = base.categorize(CategoryId("n02"));
      mockParser.parse.mockReturnValue([base]);
      mockImportTransactions.splitByCategoryStatus.mockReturnValue({
        alreadyCategorized: [],
        uncategorized: [base],
      });
      mockApplyCategoryRules.apply.mockReturnValue({ matched: [matched], unmatched: [] });
      vi.mocked(categorizePrompt).mockResolvedValue({ categorized: [], interrupted: false });
      mockImportTransactions.save.mockReturnValue({ count: 1 });

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
      const t1 = txn({ categoryId: "n01", id: "t1" });
      const t2 = txn({ id: "t2" });
      mockParser.parse.mockReturnValue([t1, t2]);
      mockImportTransactions.splitByCategoryStatus.mockReturnValue({
        alreadyCategorized: [t1],
        uncategorized: [t2],
      });
      mockApplyCategoryRules.apply.mockReturnValue({ matched: [], unmatched: [t2] });
      vi.mocked(categorizePrompt).mockResolvedValue({
        categorized: [t2.categorize(CategoryId("n02"))],
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
