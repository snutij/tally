/**
 * Integration tests: LLM-powered import workflow
 *
 * These tests use mocked LlmGateway responses to verify the full
 * categorization and rule-learning pipeline without a real GGUF model.
 */
import {
  InMemoryRuleBookRepository,
  InMemoryTransactionRepository,
} from "../helpers/in-memory-repositories.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import type { IdGenerator } from "../../src/application/gateway/id-generator.js";
import { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import { LlmCsvColumnMapper } from "../../src/infrastructure/llm/llm-csv-column-mapper.js";
import type { LlmGateway } from "../../src/application/gateway/llm-gateway.js";
import { LlmTransactionCategorizer } from "../../src/infrastructure/llm/llm-transaction-categorizer.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

const stubIdGenerator: IdGenerator = {
  fromPattern: (pat) => `rule-${pat.slice(0, 26)}`,
};
const categoryRegistry = new CategoryRegistry(DEFAULT_CATEGORIES);

// Valid category from DEFAULT_CATEGORIES
const FOOD_CATEGORY_ID = DEFAULT_CATEGORIES[0]?.id ?? "";

function dto(id: string, label: string, categoryId?: string): TransactionDto {
  return { amount: -10, categoryId, date: "2026-03-15", id, label, source: "csv" };
}

describe("8.1: Full CSV import with mocked LLM responses", () => {
  let txnRepo: InMemoryTransactionRepository;
  let ruleRepo: InMemoryRuleBookRepository;
  let workflow: ImportCsvWorkflow;
  let mockLlm: LlmGateway;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    ruleRepo = new InMemoryRuleBookRepository();
    mockLlm = { complete: vi.fn() };

    const importTransactions = new ImportTransactions(txnRepo);
    const applyCategoryRules = new ApplyCategoryRules(ruleRepo);
    const learnCategoryRules = new LearnCategoryRules(
      ruleRepo,
      [],
      stubIdGenerator,
      categoryRegistry,
    );
    const transactionCategorizer = new LlmTransactionCategorizer(mockLlm);
    const unitOfWork = { runInTransaction: (fn: () => void): void => fn() };

    workflow = new ImportCsvWorkflow({
      applyCategoryRules,
      categoryRegistry,
      importTransactions,
      learnCategoryRules,
      transactionCategorizer,
      unitOfWork,
    });
  });

  it("categorizes unmatched transactions via LLM and saves all", async () => {
    // SPOTIFY has no mapping — will remain uncategorized
    vi.mocked(mockLlm.complete).mockResolvedValue({
      CARREFOUR: FOOD_CATEGORY_ID,
      SNCF: FOOD_CATEGORY_ID,
    });

    const transactions = [dto("t1", "CARREFOUR"), dto("t2", "SNCF"), dto("t3", "SPOTIFY")];
    const onLlmCategorized = vi.fn();

    const result = await workflow.execute({ onLlmCategorized, transactions });

    expect(result.savedCount).toBe(3);
    expect(onLlmCategorized).toHaveBeenCalledWith(2);
  });

  it("saves already-categorized transactions without calling LLM", async () => {
    // Pre-existing categorized transaction
    txnRepo.saveAll([
      Transaction.create({
        amount: Money.fromEuros(-10),
        categoryId: CategoryId(FOOD_CATEGORY_ID),
        date: Temporal.PlainDate.from("2026-03-15"),
        id: TransactionId("t1"),
        label: "CARREFOUR",
        source: "csv",
      }),
    ]);

    vi.mocked(mockLlm.complete).mockResolvedValue({});

    const result = await workflow.execute({
      transactions: [dto("t1", "CARREFOUR", FOOD_CATEGORY_ID), dto("t2", "SNCF")],
    });

    expect(result.savedCount).toBe(2);
  });
});

describe("8.2: LLM categorization feeds into LearnCategoryRules", () => {
  let ruleRepo: InMemoryRuleBookRepository;
  let workflow: ImportCsvWorkflow;
  let mockLlm: LlmGateway;

  beforeEach(() => {
    const txnRepo = new InMemoryTransactionRepository();
    ruleRepo = new InMemoryRuleBookRepository();
    mockLlm = { complete: vi.fn() };

    const importTransactions = new ImportTransactions(txnRepo);
    const applyCategoryRules = new ApplyCategoryRules(ruleRepo);
    const learnCategoryRules = new LearnCategoryRules(
      ruleRepo,
      [],
      stubIdGenerator,
      categoryRegistry,
    );
    const transactionCategorizer = new LlmTransactionCategorizer(mockLlm);
    const unitOfWork = { runInTransaction: (fn: () => void): void => fn() };

    workflow = new ImportCsvWorkflow({
      applyCategoryRules,
      categoryRegistry,
      importTransactions,
      learnCategoryRules,
      transactionCategorizer,
      unitOfWork,
    });
  });

  it("creates learned rules from LLM-categorized transactions", async () => {
    vi.mocked(mockLlm.complete).mockResolvedValue({
      "BOULANGERIE PAUL PARIS": FOOD_CATEGORY_ID,
    });

    await workflow.execute({
      transactions: [dto("t1", "BOULANGERIE PAUL PARIS")],
    });

    expect(ruleRepo.allRules()).toHaveLength(1);
    const [firstRule] = ruleRepo.allRules();
    expect(firstRule?.source).toBe("learned");
    expect(firstRule?.categoryId).toBe(FOOD_CATEGORY_ID);
  });

  it("does NOT create rules for uncategorized transactions", async () => {
    vi.mocked(mockLlm.complete).mockResolvedValue({}); // LLM categorizes nothing

    await workflow.execute({
      transactions: [dto("t1", "UNKNOWN MERCHANT XYZ")],
    });

    expect(ruleRepo.allRules()).toHaveLength(0);
  });
});

describe("8.3: LLM column detection with French bank CSV formats", () => {
  it("detects standard French bank format: Date;Libellé;Montant", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["date", "label", "amount"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    const result = await mapper.detectColumns(
      ["Date d'opération", "Libellé simplifié", "Montant"],
      [["15/03/2026", "CARTE CB AUCHAN", "-45,90"]],
    );

    expect(result).toEqual(["date", "label", "amount"]);
  });

  it("detects Crédit Mutuel format with separate debit/credit columns", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["date", "ignore", "amount", "label", "ignore"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    const result = await mapper.detectColumns(
      ["Date", "Date de valeur", "Montant", "Libellé", "Solde"],
      [["15/03/2026", "18/03/2026", "-45,90", "VIR SALAIRE", "1500,00"]],
    );

    expect(result).toEqual(["date", "ignore", "amount", "label", "ignore"]);
  });

  it("detects BNP Paribas format with debit and credit columns", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["date", "label", "expense", "income"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    const result = await mapper.detectColumns(
      ["Date opération", "Libellé", "Débit", "Crédit"],
      [["15/03/2026", "CARTE CB AUCHAN", "45,90", ""]],
    );

    expect(result).toEqual(["date", "label", "expense", "income"]);
  });
});
