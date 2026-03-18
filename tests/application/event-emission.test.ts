import type {
  CategoryRuleLearnedEvent,
  TransactionCategorizedEvent,
  TransactionImportedEvent,
} from "../../src/domain/event/index.js";
import {
  InMemoryRuleBookRepository,
  InMemoryTransactionRepository,
} from "../helpers/in-memory-repositories.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { EventDispatcher } from "../../src/domain/event/event-dispatcher.js";
import { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";

const stubIdGenerator = { fromPattern: (pat: string): string => `id-${pat.slice(0, 28)}` };
const registry = new CategoryRegistry(DEFAULT_CATEGORIES);

function dto(id: string, categoryId?: string, label = `txn-${id}`): TransactionDto {
  return { amount: -10, categoryId, date: "2026-03-15", id, label, source: "csv" };
}

describe("Event emission in import workflow", () => {
  let txnGateway: InMemoryTransactionRepository;
  let ruleGateway: InMemoryRuleBookRepository;
  let eventDispatcher: EventDispatcher;
  let workflow: ImportCsvWorkflow;
  let importTransactions: ImportTransactions;
  let applyCategoryRules: ApplyCategoryRules;
  let learnCategoryRules: LearnCategoryRules;

  beforeEach(() => {
    txnGateway = new InMemoryTransactionRepository();
    ruleGateway = new InMemoryRuleBookRepository();
    eventDispatcher = new EventDispatcher();
    importTransactions = new ImportTransactions(txnGateway, eventDispatcher);
    applyCategoryRules = new ApplyCategoryRules(ruleGateway, eventDispatcher);
    learnCategoryRules = new LearnCategoryRules(
      ruleGateway,
      [],
      stubIdGenerator,
      registry,
      eventDispatcher,
    );
    const unitOfWork = { runInTransaction: (fn: () => void): void => fn() };
    workflow = new ImportCsvWorkflow(
      importTransactions,
      applyCategoryRules,
      learnCategoryRules,
      unitOfWork,
    );
  });

  it("emits TransactionImported for each saved transaction", async () => {
    const handler = vi.fn();
    eventDispatcher.on<TransactionImportedEvent>("TransactionImported", handler);
    await workflow.execute({ transactions: [dto("t1"), dto("t2")] });
    expect(handler).toHaveBeenCalledTimes(2);
    const event = handler.mock.calls[0]?.[0] as TransactionImportedEvent;
    expect(event.eventType).toBe("TransactionImported");
    expect(event.label).toBe("txn-t1");
  });

  it("emits TransactionCategorized with ruleId after auto-categorization", async () => {
    const spotifyRule = CategoryRule.create("rule-1", String.raw`\bspotify\b`, "w06", "default");
    ruleGateway.seed(spotifyRule);
    const handler = vi.fn();
    eventDispatcher.on<TransactionCategorizedEvent>("TransactionCategorized", handler);
    await workflow.execute({ transactions: [dto("t1", undefined, "PRLV SEPA SPOTIFY")] });
    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0]?.[0] as TransactionCategorizedEvent;
    expect(event.categoryId).toBe("w06");
    expect(event.ruleId).toBe("rule-1");
  });

  it("emits CategoryRuleLearned after learning from manual categorization", async () => {
    const handler = vi.fn();
    eventDispatcher.on<CategoryRuleLearnedEvent>("CategoryRuleLearned", handler);
    const promptFn = vi.fn().mockResolvedValue({
      categorized: [dto("t1", "w06", "PRLV SEPA SPOTIFY PREMIUM")],
      interrupted: false,
    });
    // Use real bank prefixes to ensure pattern extraction works
    learnCategoryRules = new LearnCategoryRules(
      ruleGateway,
      ["PRLV SEPA"],
      stubIdGenerator,
      registry,
      eventDispatcher,
    );
    workflow = new ImportCsvWorkflow(importTransactions, applyCategoryRules, learnCategoryRules, {
      runInTransaction: (fn: () => void): void => fn(),
    });
    await workflow.execute({ promptFn, transactions: [dto("t1")] });
    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0]?.[0] as CategoryRuleLearnedEvent;
    expect(event.categoryId).toBe("w06");
  });

  it("multiple event types dispatched in the same workflow run", async () => {
    const netflixRule = CategoryRule.create("rule-1", String.raw`\bnetflix\b`, "w06", "default");
    ruleGateway.seed(netflixRule);
    const importedEvents: TransactionImportedEvent[] = [];
    const categorizedEvents: TransactionCategorizedEvent[] = [];
    eventDispatcher.on<TransactionImportedEvent>("TransactionImported", (event) =>
      importedEvents.push(event),
    );
    eventDispatcher.on<TransactionCategorizedEvent>("TransactionCategorized", (event) =>
      categorizedEvents.push(event),
    );
    await workflow.execute({
      transactions: [
        dto("t1", undefined, "PRLV SEPA NETFLIX"), // auto-categorized
        dto("t2"), // not matched
      ],
    });
    expect(importedEvents).toHaveLength(2);
    expect(categorizedEvents).toHaveLength(1);
    expect(categorizedEvents[0]?.categoryId).toBe("w06");
  });
});
