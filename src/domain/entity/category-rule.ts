import { CategoryId } from "../value-object/category-id.js";
import { DomainError } from "../error/index.js";
import { createHash } from "node:crypto";

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
  pattern: string,
  categoryId: string,
  source: CategoryRuleSource,
): CategoryRule {
  try {
    // eslint-disable-next-line no-new -- validation only
    new RegExp(pattern, "i");
  } catch {
    throw new DomainError(`Invalid regex pattern: "${pattern}"`);
  }
  const id = createHash("sha256").update(pattern).digest("hex").slice(0, 32);
  return { categoryId: CategoryId.from(categoryId), id, pattern, source };
}
