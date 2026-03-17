import type { CategoryRule } from "../../domain/entity/category-rule.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";

export interface CategoryRuleDto {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly id: string;
  readonly pattern: string;
  readonly source: string;
}

export function toCategoryRuleDto(rule: CategoryRule): CategoryRuleDto {
  const category = DEFAULT_CATEGORIES.find((cat) => cat.id === rule.categoryId);
  return {
    categoryId: rule.categoryId,
    categoryName: category?.name ?? rule.categoryId,
    id: rule.id,
    pattern: rule.pattern,
    source: rule.source,
  };
}
