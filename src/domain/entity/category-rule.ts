import { CategoryId } from "../value-object/category-id.js";
import type { CategoryRegistry } from "../service/category-registry.js";
import { DomainError } from "../error/index.js";

export type CategoryRuleSource = "default" | "learned";

export interface CategoryRule {
  readonly id: string;
  readonly pattern: string;
  readonly categoryId: CategoryId;
  readonly source: CategoryRuleSource;
}

export interface DefaultRuleEntry {
  readonly pattern: string;
  readonly categoryId: string;
}

export function createCategoryRule(
  id: string,
  pattern: string,
  categoryId: string,
  source: CategoryRuleSource,
  registry: CategoryRegistry,
): CategoryRule {
  registry.assertValid(categoryId);
  try {
    // eslint-disable-next-line no-new -- validation only
    new RegExp(pattern, "i");
  } catch {
    throw new DomainError(`Invalid regex pattern: "${pattern}"`);
  }
  return { categoryId: CategoryId(categoryId), id, pattern, source };
}
