import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import type { CategoryRule } from "../../domain/entity/category-rule.js";

export interface CategoryRuleDto {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly id: string;
  readonly pattern: string;
  readonly source: string;
}

export function toCategoryRuleDto(rule: CategoryRule, registry: CategoryRegistry): CategoryRuleDto {
  return {
    categoryId: rule.categoryId,
    categoryName: registry.nameOf(rule.categoryId) ?? rule.categoryId,
    id: rule.id,
    pattern: rule.pattern,
    source: rule.source,
  };
}
