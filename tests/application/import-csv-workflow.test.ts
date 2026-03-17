import {
  InMemoryCategoryRuleRepository,
  InMemoryTransactionRepository,
} from "../helpers/in-memory-repositories.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORY_REGISTRY } from "../../src/domain/default-categories.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import type { IdGenerator } from "../../src/application/gateway/id-generator.js";
import { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

const stubIdGenerator: IdGenerator = { fromPattern: (pat) => `id-${pat.slice(0, 28)}` };

function dto(id: string, categoryId?: string): TransactionDto {
  return { amount: -10, categoryId, date: "2026-03-15", id, label: `txn-${id}`, source: "csv" };
}

describe("ImportCsvWorkflow", () => {
  let txnRepo: InMemoryTransactionRepository;
  let ruleRepo: InMemoryCategoryRuleRepository;
  let workflow: ImportCsvWorkflow;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    ruleRepo = new InMemoryCategoryRuleRepository();
    const importTransactions = new ImportTransactions(txnRepo);
    const applyCategoryRules = new ApplyCategoryRules(ruleRepo);
    const learnCategoryRules = new LearnCategoryRules(
      ruleRepo,
      [],
      stubIdGenerator,
      DEFAULT_CATEGORY_REGISTRY,
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
    txnRepo.saveAll([
      Transaction.create({
        amount: Money.fromEuros(-10),
        categoryId: CategoryId("n01"),
        date: DateOnly.from("2026-03-15"),
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
    ruleRepo.save(
      CategoryRule.create(
        "id-txn",
        String.raw`\btxn\b`,
        "n01",
        "default",
        DEFAULT_CATEGORY_REGISTRY,
      ),
    );
    const onAutoMatched = vi.fn();
    await workflow.execute({ onAutoMatched, transactions: [dto("t1")] });
    // dto label is "txn-t1" which matches \btxn\b
    expect(onAutoMatched).toHaveBeenCalledWith(1, 1);
  });
});
