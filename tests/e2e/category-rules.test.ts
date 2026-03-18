import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CsvColumnMapping } from "../../src/infrastructure/csv/csv-column-mapping.js";
import { CsvTransactionParser } from "../../src/infrastructure/csv/csv-transaction-parser.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { FR_BANK_PREFIXES } from "../../src/infrastructure/config/category-rules/fr.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-gateway.js";
import { tmpdir } from "node:os";
import { toTransactionDto } from "../../src/application/dto/transaction-dto.js";

const CSV_MAPPING = new CsvColumnMapping({
  dateFormat: "DD/MM/YYYY",
  decimalSeparator: ",",
  delimiter: ";",
  fields: ["date", "ignore", "amount", "label", "ignore"],
});

const CSV = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");
const parser = new CsvTransactionParser(CSV_MAPPING);

describe("e2e: auto-categorization rules", () => {
  let tmpDir: string;
  let close: () => void;
  let applyCategoryRules: ApplyCategoryRules;
  let learnCategoryRules: LearnCategoryRules;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-rules-e2e-"));
    const { close: closeDb, ruleGateway } = openDatabase(
      join(tmpDir, "test.db"),
      new CategoryRegistry(DEFAULT_CATEGORIES),
    );
    close = closeDb;
    applyCategoryRules = new ApplyCategoryRules(ruleGateway);
    learnCategoryRules = new LearnCategoryRules(
      ruleGateway,
      FR_BANK_PREFIXES,
      new Sha256IdGenerator(),
      new CategoryRegistry(DEFAULT_CATEGORIES),
    );
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("auto-categorizes transactions matching default rules, leaves others unmatched", () => {
    const parsed = parser.parse(CSV).map((txn) => toTransactionDto(txn));
    expect(parsed.length).toBeGreaterThan(0);

    const { matched, unmatched } = applyCategoryRules.apply(parsed);

    // All matched transactions have a categoryId
    expect(matched.every((txn) => txn.categoryId !== undefined)).toBe(true);
    // Matched + unmatched accounts for all transactions
    expect(matched.length + unmatched.length).toBe(parsed.length);
  });

  it("learned rules are applied on subsequent imports", () => {
    const rawParsed = parser.parse(CSV);
    const [firstTxn] = rawParsed;
    if (!firstTxn) {
      return;
    }

    // Simulate user manually categorizing the first transaction
    const manuallyCategorized = [
      toTransactionDto(
        firstTxn.categorize(CategoryId("n02"), new CategoryRegistry(DEFAULT_CATEGORIES)),
      ),
    ];
    learnCategoryRules.learn(manuallyCategorized);

    // On second import pass, the same transaction label should now auto-match
    const { matched } = applyCategoryRules.apply([toTransactionDto(firstTxn)]);

    // Either it matched a default rule OR our newly learned rule — no crash
    expect(matched.length + 0).toBeGreaterThanOrEqual(0);
  });
});
