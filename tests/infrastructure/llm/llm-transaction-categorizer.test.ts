import { describe, expect, it, vi } from "vitest";
import type { CategoryDto } from "../../../src/application/dto/category-dto.js";
import type { LlmGateway } from "../../../src/application/gateway/llm-gateway.js";
import { LlmTransactionCategorizer } from "../../../src/infrastructure/llm/llm-transaction-categorizer.js";
import type { TransactionDto } from "../../../src/application/dto/transaction-dto.js";

function makeCategory(id: string, name: string, group = "NEEDS"): CategoryDto {
  return { group, id, name };
}

function makeTxn(id: string, label: string): TransactionDto {
  return {
    amount: -10,
    categoryId: undefined,
    date: "2024-01-01",
    id,
    label,
    source: "bank.csv",
  };
}

const categories: CategoryDto[] = [
  makeCategory("food", "Food", "NEEDS"),
  makeCategory("transport", "Transport", "NEEDS"),
  makeCategory("streaming", "Streaming", "WANTS"),
];

describe("LlmTransactionCategorizer", () => {
  it("returns categorized results for valid response", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue({ "1": "food", "2": "transport" }),
    };
    const categorizer = new LlmTransactionCategorizer(mockLlm);

    const txns = [makeTxn("t1", "CARREFOUR"), makeTxn("t2", "SNCF")];
    const { invalidCount, results } = await categorizer.categorize(txns, categories);

    expect(results).toHaveLength(2);
    expect(results).toContainEqual({ categoryId: "food", transactionId: "t1" });
    expect(results).toContainEqual({ categoryId: "transport", transactionId: "t2" });
    expect(invalidCount).toBe(0);
  });

  it("excludes transactions with invalid category IDs and reports count", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue({ "1": "food", "2": "unknown-id" }),
    };
    const categorizer = new LlmTransactionCategorizer(mockLlm);

    const txns = [makeTxn("t1", "CARREFOUR"), makeTxn("t2", "SNCF")];
    const { invalidCount, results } = await categorizer.categorize(txns, categories);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ categoryId: "food", transactionId: "t1" });
    expect(invalidCount).toBe(1);
  });

  it("returns empty results without calling LLM for empty transaction list", async () => {
    const mockLlm: LlmGateway = { complete: vi.fn() };
    const categorizer = new LlmTransactionCategorizer(mockLlm);

    const { invalidCount, results } = await categorizer.categorize([], categories);

    expect(results).toEqual([]);
    expect(invalidCount).toBe(0);
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it("deduplicates labels and assigns same category to all matching transactions", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue({ "1": "streaming" }),
    };
    const categorizer = new LlmTransactionCategorizer(mockLlm);

    const txns = [makeTxn("t1", "SPOTIFY"), makeTxn("t2", "SPOTIFY"), makeTxn("t3", "SPOTIFY")];
    const { results } = await categorizer.categorize(txns, categories);

    expect(results).toHaveLength(3);
    expect(mockLlm.complete).toHaveBeenCalledOnce();
    for (const result of results) {
      expect(result.categoryId).toBe("streaming");
    }
  });

  it("chunks large batches and merges results", async () => {
    // 50 unique labels — should produce 3 LLM calls (20 + 20 + 10)
    const txns = Array.from({ length: 50 }, (_el, idx) => makeTxn(`t${idx}`, `LABEL_${idx}`));
    const firstBatchResponse = Object.fromEntries(
      Array.from({ length: 20 }, (_el, idx) => [String(idx + 1), "food"]),
    );
    const secondBatchResponse = Object.fromEntries(
      Array.from({ length: 20 }, (_el, idx) => [String(idx + 1), "food"]),
    );
    const thirdBatchResponse = Object.fromEntries(
      Array.from({ length: 10 }, (_el, idx) => [String(idx + 1), "transport"]),
    );

    const mockLlm: LlmGateway = {
      complete: vi
        .fn()
        .mockResolvedValueOnce(firstBatchResponse)
        .mockResolvedValueOnce(secondBatchResponse)
        .mockResolvedValueOnce(thirdBatchResponse),
    };
    const categorizer = new LlmTransactionCategorizer(mockLlm);

    const { results } = await categorizer.categorize(txns, categories);

    expect(mockLlm.complete).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(50);
  });

  it("ignores out-of-range indices in the response", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue({ "1": "food", "99": "transport" }),
    };
    const categorizer = new LlmTransactionCategorizer(mockLlm);

    const txns = [makeTxn("t1", "CARREFOUR")];
    const { invalidCount, results } = await categorizer.categorize(txns, categories);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ categoryId: "food", transactionId: "t1" });
    expect(invalidCount).toBe(0);
  });
});
