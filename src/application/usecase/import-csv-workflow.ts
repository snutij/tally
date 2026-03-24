import type {
  CategorizedResult,
  TransactionCategorizer,
} from "../gateway/transaction-categorizer.js";
import type { Category } from "../../domain/value-object/category.js";
import type { TransactionDto } from "../dto/transaction-dto.js";
import type { UnitOfWork } from "../gateway/unit-of-work.js";
import { toCategoryDto } from "../dto/category-dto.js";

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

interface CategoryLister {
  allCategories(): readonly Category[];
}

export interface ImportCsvWorkflowDeps {
  applyCategoryRules: RuleMatcher;
  categoryRegistry: CategoryLister;
  importTransactions: TransactionImporter;
  learnCategoryRules: RuleLearner;
  transactionCategorizer: TransactionCategorizer;
  unitOfWork: UnitOfWork;
}

export interface ImportCsvWorkflowInput {
  transactions: TransactionDto[];
  onAlreadyCategorized?: (count: number) => void;
  onAutoMatched?: (matchedCount: number, totalUncategorized: number) => void;
  onLlmCategorized?: (count: number) => void;
  onUncategorized?: (count: number) => void;
}

export interface ImportCsvResult {
  readonly savedCount: number;
}

export class ImportCsvWorkflow {
  private readonly deps: ImportCsvWorkflowDeps;

  constructor(deps: ImportCsvWorkflowDeps) {
    this.deps = deps;
  }

  async execute(input: ImportCsvWorkflowInput): Promise<ImportCsvResult> {
    const { transactions, onAlreadyCategorized, onAutoMatched, onLlmCategorized, onUncategorized } =
      input;

    const { alreadyCategorized, uncategorized } =
      this.deps.importTransactions.splitByCategoryStatus(transactions);

    if (alreadyCategorized.length > 0) {
      onAlreadyCategorized?.(alreadyCategorized.length);
    }

    const { matched, unmatched } = this.deps.applyCategoryRules.apply(uncategorized);

    if (matched.length > 0) {
      onAutoMatched?.(matched.length, uncategorized.length);
    }

    // LLM categorization of unmatched transactions
    const categories = this.deps.categoryRegistry.allCategories().map((cat) => toCategoryDto(cat));
    const categorizedResults: CategorizedResult[] =
      await this.deps.transactionCategorizer.categorize(unmatched, categories);

    const categorizedIdMap = new Map<string, string>(
      categorizedResults.map((result) => [result.transactionId, result.categoryId]),
    );

    const llmCategorized: TransactionDto[] = [];
    const stillUncategorized: TransactionDto[] = [];

    for (const txn of unmatched) {
      const categoryId = categorizedIdMap.get(txn.id);
      if (categoryId) {
        llmCategorized.push({ ...txn, categoryId });
      } else {
        stillUncategorized.push(txn);
      }
    }

    if (llmCategorized.length > 0) {
      onLlmCategorized?.(llmCategorized.length);
    }
    if (stillUncategorized.length > 0) {
      onUncategorized?.(stillUncategorized.length);
    }

    const toSave = [...alreadyCategorized, ...matched, ...llmCategorized, ...stillUncategorized];
    let savedCount = 0;

    this.deps.unitOfWork.runInTransaction(() => {
      const result = this.deps.importTransactions.save(toSave);
      savedCount = result.count;
      // Only learn from LLM-categorized transactions (not regex-matched, not uncategorized)
      this.deps.learnCategoryRules.learn(llmCategorized);
    });

    return { savedCount };
  }
}
