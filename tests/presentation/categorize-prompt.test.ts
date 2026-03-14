import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";
import { buildCategoryChoices } from "../../src/presentation/prompt/categorize-prompt.js";

vi.mock("@inquirer/select", () => ({ default: vi.fn() }));
vi.mock("@inquirer/core", () => ({
  ExitPromptError: class ExitPromptError extends Error {},
}));

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    amount: Money.fromEuros(-42),
    date: DateOnly.from("2026-01-15"),
    id: "t1",
    label: "TEST",
    source: "test",
    ...overrides,
  };
}

describe("buildCategoryChoices", () => {
  it("includes all default categories as selectable choices", () => {
    const choices = buildCategoryChoices();
    const selectableValues = choices
      .filter((ch): ch is { value: string; name: string } => "value" in ch)
      .map((ch) => ch.value);

    for (const cat of DEFAULT_CATEGORIES) {
      expect(selectableValues).toContain(cat.id);
    }
  });

  it("includes skip option and income category", () => {
    const choices = buildCategoryChoices();
    const selectableValues = choices
      .filter((ch): ch is { value: string; name: string } => "value" in ch)
      .map((ch) => ch.value);

    expect(selectableValues).toContain("__skip__");
    expect(selectableValues).toContain("inc01");
  });

  it("has group separators", () => {
    const choices = buildCategoryChoices();
    const separators = choices
      .filter((ch): ch is { type: "separator"; separator: string } => "type" in ch)
      .map((ch) => ch.separator);

    expect(separators).toContain("— Needs —");
    expect(separators).toContain("— Wants —");
    expect(separators).toContain("— Investments —");
    expect(separators).toContain("— Income —");
  });
});

describe("categorizePrompt", () => {
  let selectMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@inquirer/select");
    selectMock = mod.default as ReturnType<typeof vi.fn>;
    selectMock.mockReset();
  });

  it("assigns categoryId when a category is selected", async () => {
    selectMock.mockResolvedValueOnce("n02");
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    const result = await categorizePrompt([txn()]);

    expect(result.interrupted).toBe(false);
    expect(result.categorized).toHaveLength(1);
    expect(result.categorized[0].categoryId).toBe("n02");
  });

  it("does not assign categoryId when skip is selected", async () => {
    selectMock.mockResolvedValueOnce("__skip__");
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    const result = await categorizePrompt([txn()]);

    expect(result.categorized[0].categoryId).toBeUndefined();
  });

  it("assigns inc01 categoryId when income is selected", async () => {
    selectMock.mockResolvedValueOnce("inc01");
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    const result = await categorizePrompt([txn()]);

    expect(result.categorized[0].categoryId).toBe("inc01");
  });

  it("formats positive amount with + sign in prompt header", async () => {
    selectMock.mockResolvedValueOnce("inc01");
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    await categorizePrompt([txn({ amount: Money.fromEuros(100) })]);

    expect(selectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("+100.00"),
      }),
    );
  });

  it("re-throws non-ExitPromptError", async () => {
    selectMock.mockRejectedValueOnce(new Error("boom"));
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");
    await expect(categorizePrompt([txn()])).rejects.toThrow("boom");
  });

  it("returns partial results on Ctrl+C (ExitPromptError)", async () => {
    const { ExitPromptError } = await import("@inquirer/core");

    selectMock.mockResolvedValueOnce("n01").mockRejectedValueOnce(new ExitPromptError(""));

    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    const result = await categorizePrompt([txn({ id: "t1" }), txn({ id: "t2" })]);

    expect(result.interrupted).toBe(true);
    expect(result.categorized).toHaveLength(1);
    expect(result.categorized[0].categoryId).toBe("n01");
  });
});
