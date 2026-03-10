import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";

vi.mock("../../src/presentation/prompt/categorize-prompt.js", () => ({
  categorizePrompt: vi.fn(),
}));

import { categorizePrompt } from "../../src/presentation/prompt/categorize-prompt.js";
import { createTransactionsCommand } from "../../src/presentation/command/transactions-command.js";

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    amount: Money.fromEuros(-42),
    date: DateOnly.from("2026-03-15"),
    id: "t1",
    label: "TEST",
    sourceBank: "test",
    ...overrides,
  };
}

describe("createTransactionsCommand", () => {
  const mockTxnRepo = {
    findByIds: vi.fn(),
    findByMonth: vi.fn(),
    saveAll: vi.fn(),
  };
  const mockRenderer = { render: vi.fn((d: unknown) => JSON.stringify(d)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createTransactionsCommand(mockTxnRepo, mockRenderer);
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "transactions", ...args]);
  }

  it("lists transactions for a month", async () => {
    mockTxnRepo.findByMonth.mockReturnValue([txn()]);
    await run("2026-03");
    expect(mockTxnRepo.findByMonth).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

  it("categorize shows message when all categorized", async () => {
    mockTxnRepo.findByMonth.mockReturnValue([txn({ categoryId: "n01" })]);
    await run("categorize", "2026-03");
    expect(mockRenderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ message: "All transactions are categorized" }),
    );
  });

  it("categorize prompts and saves uncategorized transactions", async () => {
    const t = txn();
    mockTxnRepo.findByMonth.mockReturnValue([t]);
    vi.mocked(categorizePrompt).mockResolvedValue({
      categorized: [{ ...t, categoryId: "n01" }],
      interrupted: false,
    });

    await run("categorize", "2026-03");

    expect(categorizePrompt).toHaveBeenCalledWith([t]);
    expect(mockTxnRepo.saveAll).toHaveBeenCalledWith([{ ...t, categoryId: "n01" }]);
  });

  it("categorize handles interruption", async () => {
    const t = txn();
    mockTxnRepo.findByMonth.mockReturnValue([t]);
    vi.mocked(categorizePrompt).mockResolvedValue({
      categorized: [],
      interrupted: true,
    });

    await run("categorize", "2026-03");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Interrupted"));
  });
});
