import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";

vi.mock("../../src/presentation/prompt/categorize-prompt.js", () => ({
  categorizePrompt: vi.fn(),
}));

import { categorizePrompt } from "../../src/presentation/prompt/categorize-prompt.js";
import { createTransactionsCommand } from "../../src/presentation/command/transactions-command.js";

function dto(overrides: { id?: string; categoryId?: string } = {}): TransactionDto {
  return {
    amount: -42,
    categoryId: overrides.categoryId,
    date: "2026-03-15",
    id: overrides.id ?? "t1",
    label: "TEST",
    source: "csv",
  };
}

describe("createTransactionsCommand", () => {
  const mockListTransactions = { execute: vi.fn() };
  const mockFindUncategorized = { execute: vi.fn() };
  const mockSaveCategorized = { execute: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createTransactionsCommand(
      mockListTransactions as never,
      mockFindUncategorized as never,
      mockSaveCategorized as never,
      mockRenderer,
      [],
    );
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "transactions", ...args]);
  }

  it("lists transactions for a month", async () => {
    mockListTransactions.execute.mockReturnValue([dto()]);
    await run("2026-03");
    expect(mockListTransactions.execute).toHaveBeenCalledWith("2026-03");
    expect(console.log).toHaveBeenCalled();
  });

  it("categorize shows message when all categorized", async () => {
    mockFindUncategorized.execute.mockReturnValue({
      all: [dto({ categoryId: "n01" })],
      uncategorized: [],
    });
    await run("categorize", "2026-03");
    expect(mockRenderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ message: "All transactions are categorized" }),
    );
  });

  it("categorize prompts and saves uncategorized transactions", async () => {
    const tx = dto();
    const categorized = { ...tx, categoryId: "n01" };
    mockFindUncategorized.execute.mockReturnValue({
      all: [tx],
      uncategorized: [tx],
    });
    vi.mocked(categorizePrompt).mockResolvedValue({
      categorized: [categorized],
      interrupted: false,
    });

    await run("categorize", "2026-03");

    expect(categorizePrompt).toHaveBeenCalledWith([tx], []);
    expect(mockSaveCategorized.execute).toHaveBeenCalledWith([{ categoryId: "n01", id: tx.id }]);
  });

  it("categorize handles interruption", async () => {
    const tx = dto();
    mockFindUncategorized.execute.mockReturnValue({
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
