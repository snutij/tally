/**
 * E2E tests for smart categorization.
 *
 * Tests the full pipeline using a mock CategorySuggester to verify integration
 * between the workflow, prompt, and rule learning without requiring the ONNX model.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import type { CategorySuggester } from "../../src/application/gateway/category-suggester.js";
import { FR_BANK_PREFIXES } from "../../src/infrastructure/config/category-rules/fr.js";
import { ImportCsvWorkflow } from "../../src/application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

// Labels guaranteed not to match any French default rules
const UNKNOWN_LABEL_1 = "XYZZY UNKNOWN MERCHANT 99991";
const UNKNOWN_LABEL_2 = "QQQQQ OBSCURE VENDOR 88882";

function txn(id: string, label: string, suggestedCategoryId?: string): TransactionDto {
  return {
    amount: -10,
    categoryId: undefined,
    date: "2026-03-15",
    id,
    label,
    source: "csv",
    suggestedCategoryId,
  };
}

describe("e2e: smart categorization pipeline", () => {
  let tmpDir: string;
  let workflow: ImportCsvWorkflow;
  let learnCategoryRules: LearnCategoryRules;
  let ruleBookRepository: ReturnType<typeof openDatabase>["ruleBookRepository"];
  let closeDb: () => void;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-smart-e2e-"));
    const idGenerator = new Sha256IdGenerator();
    const db = openDatabase(join(tmpDir, "test.db"), idGenerator);
    closeDb = db.close;
    ({ ruleBookRepository } = db);

    const registry = new CategoryRegistry(db.categoryRepository.findAll());
    const importTransactions = new ImportTransactions(db.txnRepository);
    const applyCategoryRules = new ApplyCategoryRules(db.ruleBookRepository);
    learnCategoryRules = new LearnCategoryRules(
      db.ruleBookRepository,
      FR_BANK_PREFIXES,
      idGenerator,
      registry,
    );
    workflow = new ImportCsvWorkflow(
      importTransactions,
      applyCategoryRules,
      learnCategoryRules,
      db.unitOfWork,
    );
  });

  afterEach(() => {
    closeDb();
    rmSync(tmpDir, { recursive: true });
  });

  it("enriched transactions with suggestion enter prompt with suggestedCategoryId set", async () => {
    const mockSuggester: CategorySuggester = {
      init: vi.fn().mockReturnValue(Promise.resolve()),
      learnBatch: vi.fn().mockReturnValue(Promise.resolve()),
      suggest: vi
        .fn()
        .mockImplementation((txns: TransactionDto[]) =>
          Promise.resolve(txns.map((item) => ({ ...item, suggestedCategoryId: "n02" }))),
        ),
    };

    let promptReceived: TransactionDto[] = [];
    const promptFn = vi.fn().mockImplementation((txns: TransactionDto[]) => {
      promptReceived = txns;
      return Promise.resolve({
        categorized: txns.map((item) => ({ ...item, categoryId: item.suggestedCategoryId })),
        interrupted: false,
      });
    });

    const onSuggested = vi.fn();
    await workflow.execute({
      categorySuggester: mockSuggester,
      onSuggested,
      promptFn,
      transactions: [txn("t1", UNKNOWN_LABEL_1), txn("t2", UNKNOWN_LABEL_2)],
    });

    // All unmatched transactions received suggestions
    expect(promptReceived.every((item) => item.suggestedCategoryId === "n02")).toBe(true);
    expect(onSuggested).toHaveBeenCalledWith(2);
  });

  it("user confirms suggestion → rule gets source 'suggested'", () => {
    // User confirms: suggestedCategoryId === final categoryId
    const confirmed: TransactionDto[] = [
      { ...txn("t1", "PRLV SEPA SPOTIFY", "w06"), categoryId: "w06" },
    ];
    learnCategoryRules.learn(confirmed);

    const rule = ruleBookRepository.load().findByPattern(String.raw`\bspotify\b`);
    expect(rule?.source).toBe("suggested");
  });

  it("user overrides suggestion → rule gets source 'learned'", () => {
    // suggestedCategoryId was "n02" but user chose "w06"
    const overridden: TransactionDto[] = [
      { ...txn("t1", "PRLV SEPA SPOTIFY", "n02"), categoryId: "w06" },
    ];
    learnCategoryRules.learn(overridden);

    const rule = ruleBookRepository.load().findByPattern(String.raw`\bspotify\b`);
    expect(rule?.source).toBe("learned");
    expect(rule?.categoryId).toBe("w06");
  });
});
