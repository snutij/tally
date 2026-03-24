import type { CategoryDto } from "../dto/category-dto.js";
import type { TransactionDto } from "../dto/transaction-dto.js";

export interface CategorizedResult {
  readonly categoryId: string;
  readonly transactionId: string;
}

export interface TransactionCategorizer {
  categorize(
    transactions: TransactionDto[],
    categories: CategoryDto[],
  ): Promise<CategorizedResult[]>;
}
