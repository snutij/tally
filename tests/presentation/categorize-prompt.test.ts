import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { buildCategoryChoices } from "../../src/application/category-choices.js";

vi.mock("@inquirer/select", () => ({ default: vi.fn() }));
vi.mock("@inquirer/core", () => ({
  ExitPromptError: class ExitPromptError extends Error {},
}));

function txn(overrides: { amount?: number; id?: string } = {}): TransactionDto {
  return {
    amount: overrides.amount ?? -42,
    categoryId: undefined,
    date: "2026-01-15",
    id: overrides.id ?? "t1",
    label: "TEST",
    source: "csv",
  };
}

describe("buildCategoryChoices", () => {
  it("includes all default categories as selectable choices", () => {
    const groups = buildCategoryChoices(DEFAULT_CATEGORIES);
    const allIds = groups.flatMap((group) => group.categories.map((cat) => cat.id));

    for (const cat of DEFAULT_CATEGORIES) {
      expect(allIds).toContain(cat.id);
    }
  });

  it("includes income category in income group", () => {
    const groups = buildCategoryChoices(DEFAULT_CATEGORIES);
    const incomeGroup = groups.find((group) => group.groupKey === "INCOME");

    expect(incomeGroup?.categories.map((cat) => cat.id)).toContain("inc01");
  });

  it("has labels for all groups", () => {
    const groups = buildCategoryChoices(DEFAULT_CATEGORIES);
    const labels = groups.map((group) => group.label);

    expect(labels).toContain("— Needs —");
    expect(labels).toContain("— Wants —");
    expect(labels).toContain("— Investments —");
    expect(labels).toContain("— Income —");
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

    const result = await categorizePrompt([txn()], buildCategoryChoices(DEFAULT_CATEGORIES));

    expect(result.interrupted).toBe(false);
    expect(result.categorized).toHaveLength(1);
    expect(result.categorized[0]?.categoryId).toBe("n02");
  });

  it("does not assign categoryId when skip is selected", async () => {
    selectMock.mockResolvedValueOnce("__skip__");
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    const result = await categorizePrompt([txn()], []);

    expect(result.categorized[0]?.categoryId).toBeUndefined();
  });

  it("assigns inc01 categoryId when income is selected", async () => {
    selectMock.mockResolvedValueOnce("inc01");
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    const result = await categorizePrompt([txn()], []);

    expect(result.categorized[0]?.categoryId).toBe("inc01");
  });

  it("formats positive amount with + sign in prompt header", async () => {
    selectMock.mockResolvedValueOnce("inc01");
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    await categorizePrompt([txn({ amount: 100 })], []);

    expect(selectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("+100.00"),
      }),
    );
  });

  it("re-throws non-ExitPromptError", async () => {
    selectMock.mockRejectedValueOnce(new Error("boom"));
    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");
    await expect(categorizePrompt([txn()], [])).rejects.toThrow("boom");
  });

  it("returns partial results on Ctrl+C (ExitPromptError)", async () => {
    const { ExitPromptError } = await import("@inquirer/core");

    selectMock.mockResolvedValueOnce("n01").mockRejectedValueOnce(new ExitPromptError(""));

    const { categorizePrompt } = await import("../../src/presentation/prompt/categorize-prompt.js");

    const result = await categorizePrompt([txn({ id: "t1" }), txn({ id: "t2" })], []);

    expect(result.interrupted).toBe(true);
    expect(result.categorized).toHaveLength(1);
    expect(result.categorized[0]?.categoryId).toBe("n01");
  });
});
