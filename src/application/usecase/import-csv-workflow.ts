import type { CategorySuggester } from "../gateway/category-suggester.js";
import type { TransactionDto } from "../dto/transaction-dto.js";
import type { UnitOfWork } from "../gateway/unit-of-work.js";

// Structural interfaces — concrete use cases satisfy these without explicit `implements`

interface TransactionImporter {
  splitByCategoryStatus(transactions: TransactionDto[]): {
    alreadyCategorized: TransactionDto[];
    uncategorized: TransactionDto[];
  };
  save(transactions: TransactionDto[]): { count: number };
}

interface RuleMatcher {
  apply(transactions: TransactionDto[]): {
    matched: TransactionDto[];
    unmatched: TransactionDto[];
  };
}

interface RuleLearner {
  learn(transactions: TransactionDto[]): void;
}

export interface CategorizeResult {
  categorized: TransactionDto[];
  interrupted: boolean;
}

export interface ImportCsvWorkflowInput {
  transactions: TransactionDto[];
  promptFn?: (uncategorized: TransactionDto[]) => Promise<CategorizeResult>;
  categorySuggester?: CategorySuggester;
  onAlreadyCategorized?: (count: number) => void;
  onAutoMatched?: (matchedCount: number, totalUncategorized: number) => void;
  /** Called with the number of transactions that received a semantic suggestion. */
  onSuggested?: (suggestedCount: number) => void;
}

export interface ImportCsvResult {
  readonly savedCount: number;
  readonly interrupted: boolean;
}

export class ImportCsvWorkflow {
  private readonly importTransactions: TransactionImporter;
  private readonly applyCategoryRules: RuleMatcher;
  private readonly learnCategoryRules: RuleLearner;
  private readonly unitOfWork: UnitOfWork;

  constructor(
    importTransactions: TransactionImporter,
    applyCategoryRules: RuleMatcher,
    learnCategoryRules: RuleLearner,
    unitOfWork: UnitOfWork,
  ) {
    this.importTransactions = importTransactions;
    this.applyCategoryRules = applyCategoryRules;
    this.learnCategoryRules = learnCategoryRules;
    this.unitOfWork = unitOfWork;
  }

  async execute(input: ImportCsvWorkflowInput): Promise<ImportCsvResult> {
    const {
      transactions,
      promptFn,
      categorySuggester,
      onAlreadyCategorized,
      onAutoMatched,
      onSuggested,
    } = input;

    const { alreadyCategorized, uncategorized } =
      this.importTransactions.splitByCategoryStatus(transactions);

    if (alreadyCategorized.length > 0) {
      onAlreadyCategorized?.(alreadyCategorized.length);
    }

    const { matched, unmatched } = this.applyCategoryRules.apply(uncategorized);

    if (matched.length > 0) {
      onAutoMatched?.(matched.length, uncategorized.length);
    }

    // Enrichment step: annotate unmatched transactions with AI suggestions.
    // All enriched transactions still enter the prompt — suggestions only pre-select.
    let enriched = unmatched;
    if (categorySuggester && unmatched.length > 0) {
      enriched = await categorySuggester.suggest(unmatched);
      const suggestedCount = enriched.filter((txn) => txn.suggestedCategoryId !== undefined).length;
      if (suggestedCount > 0) {
        onSuggested?.(suggestedCount);
      }
    }

    let manualCategorized: TransactionDto[] = [];
    let interrupted = false;

    if (promptFn) {
      const promptResult = await promptFn(enriched);
      manualCategorized = promptResult.categorized;
      ({ interrupted } = promptResult);
    }

    // When no promptFn, include enriched (unmatched) as-is (no interactive categorization)
    const remaining = promptFn ? manualCategorized : enriched;
    const toSave = [...alreadyCategorized, ...matched, ...remaining];
    let savedCount = 0;

    this.unitOfWork.runInTransaction(() => {
      const result = this.importTransactions.save(toSave);
      savedCount = result.count;
      this.learnCategoryRules.learn(remaining);
    });

    // Update embedding index with newly categorized labels (outside the DB transaction
    // since model inference is async and cannot run inside better-sqlite3's sync transaction)
    if (categorySuggester) {
      const categorized = remaining
        .filter(
          (txn): txn is TransactionDto & { categoryId: string } => txn.categoryId !== undefined,
        )
        .map(({ label, categoryId }) => ({ categoryId, label }));
      await categorySuggester.learnBatch(categorized);
    }

    return { interrupted, savedCount };
  }
}
