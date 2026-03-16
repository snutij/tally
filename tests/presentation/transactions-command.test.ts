import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { Command } from "commander";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

vi.mock("../../src/presentation/prompt/categorize-prompt.js", () => ({
  categorizePrompt: vi.fn(),
}));

import { categorizePrompt } from "../../src/presentation/prompt/categorize-prompt.js";
import { createTransactionsCommand } from "../../src/presentation/command/transactions-command.js";

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

describe("createTransactionsCommand", () => {
  const mockListTransactions = { findByMonth: vi.fn() };
  const mockCategorizeTransactions = { findUncategorized: vi.fn(), saveCategorized: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createTransactionsCommand(
      mockListTransactions as never,
      mockCategorizeTransactions as never,
      mockRenderer,
    );
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "transactions", ...args]);
  }

  it("lists transactions for a month", async () => {
    mockListTransactions.findByMonth.mockReturnValue([txn()]);
    await run("2026-03");
    expect(mockListTransactions.findByMonth).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

  it("categorize shows message when all categorized", async () => {
    mockCategorizeTransactions.findUncategorized.mockReturnValue({
      all: [txn({ categoryId: "n01" })],
      uncategorized: [],
    });
    await run("categorize", "2026-03");
    expect(mockRenderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ message: "All transactions are categorized" }),
    );
  });

  it("categorize prompts and saves uncategorized transactions", async () => {
    const tx = txn();
    const categorized = tx.categorize(CategoryId("n01"));
    mockCategorizeTransactions.findUncategorized.mockReturnValue({
      all: [tx],
      uncategorized: [tx],
    });
    vi.mocked(categorizePrompt).mockResolvedValue({
      categorized: [categorized],
      interrupted: false,
    });

    await run("categorize", "2026-03");

    expect(categorizePrompt).toHaveBeenCalledWith([tx]);
    expect(mockCategorizeTransactions.saveCategorized).toHaveBeenCalledWith([categorized]);
  });

  it("categorize handles interruption", async () => {
    const tx = txn();
    mockCategorizeTransactions.findUncategorized.mockReturnValue({
      all: [tx],
      uncategorized: [tx],
    });
    vi.mocked(categorizePrompt).mockResolvedValue({
      categorized: [],
      interrupted: true,
    });

    await run("categorize", "2026-03");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Interrupted"));
  });
});
