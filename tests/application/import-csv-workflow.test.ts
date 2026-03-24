import {
  InMemoryRuleBookRepository,
  InMemoryTransactionRepository,
} from "../helpers/in-memory-repositories.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";

import type { IdGenerator } from "../../src/application/gateway/id-generator.js";
import { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionCategorizer } from "../../src/application/gateway/transaction-categorizer.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

const stubIdGenerator: IdGenerator = { fromPattern: (pat) => `id-${pat.slice(0, 28)}` };
const categoryRegistry = new CategoryRegistry(DEFAULT_CATEGORIES);

function dto(id: string, categoryId?: string): TransactionDto {
  return { amount: -10, categoryId, date: "2026-03-15", id, label: `txn-${id}`, source: "csv" };
}

describe("ImportCsvWorkflow", () => {
  let txnGateway: InMemoryTransactionRepository;
  let ruleGateway: InMemoryRuleBookRepository;
  let learnCategoryRules: LearnCategoryRules;
  let mockCategorizer: TransactionCategorizer;
  let workflow: ImportCsvWorkflow;

  beforeEach(() => {
    txnGateway = new InMemoryTransactionRepository();
    ruleGateway = new InMemoryRuleBookRepository();
    const importTransactions = new ImportTransactions(txnGateway);
    const applyCategoryRules = new ApplyCategoryRules(ruleGateway);
    learnCategoryRules = new LearnCategoryRules(ruleGateway, [], stubIdGenerator, categoryRegistry);
    const unitOfWork = { runInTransaction: (fn: () => void): void => fn() };
    mockCategorizer = { categorize: vi.fn().mockResolvedValue([]) };
    workflow = new ImportCsvWorkflow({
      applyCategoryRules,
      categoryRegistry,
      importTransactions,
      learnCategoryRules,
      transactionCategorizer: mockCategorizer,
      unitOfWork,
    });
  });

  it("saves all transactions and returns count", async () => {
    const result = await workflow.execute({ transactions: [dto("t1"), dto("t2")] });
    expect(result.savedCount).toBe(2);
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

  it("calls onAutoMatched callback when rules match", async () => {
    ruleGateway.seed(CategoryRule.create("id-txn", String.raw`\btxn\b`, "n01", "default"));
    const onAutoMatched = vi.fn();
    await workflow.execute({ onAutoMatched, transactions: [dto("t1")] });
    expect(onAutoMatched).toHaveBeenCalledWith(1, 1);
  });

  it("calls onLlmCategorized when LLM categorizes transactions", async () => {
    vi.mocked(mockCategorizer.categorize).mockResolvedValue([
      { categoryId: "n01", transactionId: "t1" },
    ]);
    const onLlmCategorized = vi.fn();
    await workflow.execute({ onLlmCategorized, transactions: [dto("t1")] });
    expect(onLlmCategorized).toHaveBeenCalledWith(1);
  });

  it("calls onUncategorized for transactions not categorized by LLM", async () => {
    // mockCategorizer returns empty (no categorizations)
    const onUncategorized = vi.fn();
    await workflow.execute({ onUncategorized, transactions: [dto("t1"), dto("t2")] });
    expect(onUncategorized).toHaveBeenCalledWith(2);
  });

  it("calls learnCategoryRules.learn only with LLM-categorized transactions", async () => {
    vi.mocked(mockCategorizer.categorize).mockResolvedValue([
      { categoryId: "n01", transactionId: "t1" },
    ]);
    const learnSpy = vi.spyOn(learnCategoryRules, "learn");

    await workflow.execute({ transactions: [dto("t1"), dto("t2")] });

    expect(learnSpy).toHaveBeenCalledOnce();
    const [[learnArg]] = learnSpy.mock.calls;
    expect(learnArg).toHaveLength(1);
    expect(learnArg?.[0]?.id).toBe("t1");
  });

  it("does not call learnCategoryRules.learn with uncategorized transactions", async () => {
    // mockCategorizer returns empty — t1 and t2 remain uncategorized
    const learnSpy = vi.spyOn(learnCategoryRules, "learn");

    await workflow.execute({ transactions: [dto("t1"), dto("t2")] });

    expect(learnSpy).toHaveBeenCalledWith([]);
  });
});
