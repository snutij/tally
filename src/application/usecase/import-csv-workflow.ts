import type { TransactionDto } from "../dto/transaction-dto.js";
import type { UnitOfWork } from "../port/unit-of-work.js";

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
  onAlreadyCategorized?: (count: number) => void;
  onAutoMatched?: (matchedCount: number, totalUncategorized: number) => void;
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
    const { transactions, promptFn, onAlreadyCategorized, onAutoMatched } = input;

    const { alreadyCategorized, uncategorized } =
      this.importTransactions.splitByCategoryStatus(transactions);

    if (alreadyCategorized.length > 0) {
      onAlreadyCategorized?.(alreadyCategorized.length);
    }

    const { matched, unmatched } = this.applyCategoryRules.apply(uncategorized);

    if (matched.length > 0) {
      onAutoMatched?.(matched.length, uncategorized.length);
    }

    let manualCategorized: TransactionDto[] = [];
    let interrupted = false;

    if (promptFn) {
      const promptResult = await promptFn(unmatched);
      manualCategorized = promptResult.categorized;
      ({ interrupted } = promptResult);
    }

    // When no promptFn, include unmatched as-is (no interactive categorization)
    const remaining = promptFn ? manualCategorized : unmatched;
    const toSave = [...alreadyCategorized, ...matched, ...remaining];
    let savedCount = 0;

    this.unitOfWork.runInTransaction(() => {
      const result = this.importTransactions.save(toSave);
      savedCount = result.count;
      this.learnCategoryRules.learn(remaining);
    });

    return { interrupted, savedCount };
  }
}
