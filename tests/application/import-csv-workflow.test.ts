import {
  InMemoryRuleBookRepository,
  InMemoryTransactionRepository,
} from "../helpers/in-memory-repositories.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import type { CategorySuggester } from "../../src/application/gateway/category-suggester.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";

import type { IdGenerator } from "../../src/application/gateway/id-generator.js";
import { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

const stubIdGenerator: IdGenerator = { fromPattern: (pat) => `id-${pat.slice(0, 28)}` };

function dto(id: string, categoryId?: string, suggestedCategoryId?: string): TransactionDto {
  return {
    amount: -10,
    categoryId,
    date: "2026-03-15",
    id,
    label: `txn-${id}`,
    source: "csv",
    suggestedCategoryId,
  };
}

describe("ImportCsvWorkflow", () => {
  let txnGateway: InMemoryTransactionRepository;
  let ruleGateway: InMemoryRuleBookRepository;
  let workflow: ImportCsvWorkflow;

  beforeEach(() => {
    txnGateway = new InMemoryTransactionRepository();
    ruleGateway = new InMemoryRuleBookRepository();
    const importTransactions = new ImportTransactions(txnGateway);
    const applyCategoryRules = new ApplyCategoryRules(ruleGateway);
    const learnCategoryRules = new LearnCategoryRules(
      ruleGateway,
      [],
      stubIdGenerator,
      new CategoryRegistry(DEFAULT_CATEGORIES),
    );
    const unitOfWork = { runInTransaction: (fn: () => void): void => fn() };
    workflow = new ImportCsvWorkflow(
      importTransactions,
      applyCategoryRules,
      learnCategoryRules,
      unitOfWork,
    );
  });

  it("saves all transactions and returns count", async () => {
    const result = await workflow.execute({ transactions: [dto("t1"), dto("t2")] });
    expect(result.savedCount).toBe(2);
    expect(result.interrupted).toBe(false);
  });

  it("calls onAlreadyCategorized callback when applicable", async () => {
    txnGateway.saveAll([
      Transaction.create({
        amount: Money.fromEuros(-10),
        categoryId: CategoryId("n01"),
        date: Temporal.PlainDate.from("2026-03-15"),
        id: TransactionId("t1"),
        label: "txn-t1",
        source: "csv",
      }),
    ]);
    const onAlreadyCategorized = vi.fn();
    await workflow.execute({ onAlreadyCategorized, transactions: [dto("t1"), dto("t2")] });
    expect(onAlreadyCategorized).toHaveBeenCalledWith(1);
  });

  it("calls promptFn with unmatched transactions", async () => {
    const promptFn = vi.fn().mockResolvedValue({ categorized: [], interrupted: false });
    await workflow.execute({ promptFn, transactions: [dto("t1")] });
    expect(promptFn).toHaveBeenCalledWith([dto("t1")]);
  });

  it("propagates interrupted flag from promptFn", async () => {
    const promptFn = vi.fn().mockResolvedValue({ categorized: [], interrupted: true });
    const result = await workflow.execute({ promptFn, transactions: [dto("t1")] });
    expect(result.interrupted).toBe(true);
  });

  it("does not call promptFn when not provided", async () => {
    const result = await workflow.execute({ transactions: [dto("t1")] });
    expect(result.savedCount).toBe(1);
  });

  it("calls onAutoMatched callback when rules match", async () => {
    ruleGateway.seed(CategoryRule.create("id-txn", String.raw`\btxn\b`, "n01", "default"));
    const onAutoMatched = vi.fn();
    await workflow.execute({ onAutoMatched, transactions: [dto("t1")] });
    // dto label is "txn-t1" which matches \btxn\b
    expect(onAutoMatched).toHaveBeenCalledWith(1, 1);
  });

  it("passes unmatched transactions through categorySuggester before prompt", async () => {
    const enriched = dto("t1", undefined, "n02");
    const suggester: CategorySuggester = {
      learnBatch: vi.fn().mockResolvedValue(),
      suggest: vi.fn().mockResolvedValue([enriched]),
    };
    const promptFn = vi.fn().mockResolvedValue({ categorized: [], interrupted: false });

    await workflow.execute({ categorySuggester: suggester, promptFn, transactions: [dto("t1")] });

    expect(suggester.suggest).toHaveBeenCalledWith([dto("t1")]);
    // Prompt receives the enriched transaction (with suggestedCategoryId set)
    expect(promptFn).toHaveBeenCalledWith([enriched]);
  });

  it("calls onSuggested with the count of enriched transactions", async () => {
    const enriched = [dto("t1", undefined, "n02"), dto("t2", undefined, "n02")];
    const suggester: CategorySuggester = {
      learnBatch: vi.fn().mockResolvedValue(),
      suggest: vi.fn().mockResolvedValue(enriched),
    };
    const onSuggested = vi.fn();
    const promptFn = vi.fn().mockResolvedValue({ categorized: [], interrupted: false });

    await workflow.execute({
      categorySuggester: suggester,
      onSuggested,
      promptFn,
      transactions: [dto("t1"), dto("t2")],
    });

    expect(onSuggested).toHaveBeenCalledWith(2);
  });

  it("calls categorySuggester.learnBatch after transaction save", async () => {
    const enriched = dto("t1", undefined, "n02");
    const confirmed = dto("t1", "n02", "n02");
    const suggester: CategorySuggester = {
      learnBatch: vi.fn().mockResolvedValue(),
      suggest: vi.fn().mockResolvedValue([enriched]),
    };
    const promptFn = vi.fn().mockResolvedValue({ categorized: [confirmed], interrupted: false });

    await workflow.execute({ categorySuggester: suggester, promptFn, transactions: [dto("t1")] });

    expect(suggester.learnBatch).toHaveBeenCalledWith([confirmed]);
  });

  it("works without categorySuggester (backward compatible)", async () => {
    // No suggester: promptFn gets the raw unmatched transaction (no enrichment)
    const promptFn = vi.fn().mockResolvedValue({
      categorized: [dto("t1", "n01")],
      interrupted: false,
    });
    const result = await workflow.execute({ promptFn, transactions: [dto("t1")] });
    expect(result.savedCount).toBe(1);
    // promptFn receives the transaction without suggestedCategoryId (no enrichment)
    expect(promptFn).toHaveBeenCalledWith([dto("t1")]);
  });
});
