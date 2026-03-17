import { CategoryId } from "../value-object/category-id.js";
import type { CategoryRegistry } from "../service/category-registry.js";
import { CategoryRuleId } from "../value-object/category-rule-id.js";
import { DomainError } from "../error/index.js";

export type CategoryRuleSource = "default" | "learned";

export interface DefaultRuleEntry {
  readonly pattern: string;
  readonly categoryId: string;
}

export class CategoryRule {
  readonly id: CategoryRuleId;
  readonly pattern: string;
  readonly categoryId: CategoryId;
  readonly source: CategoryRuleSource;

  private constructor(
    id: CategoryRuleId,
    pattern: string,
    categoryId: CategoryId,
    source: CategoryRuleSource,
  ) {
    this.id = id;
    this.pattern = pattern;
    this.categoryId = categoryId;
    this.source = source;
  }

  static create(
    id: string,
    pattern: string,
    categoryId: string,
    source: CategoryRuleSource,
    registry: CategoryRegistry,
  ): CategoryRule {
    registry.assertValid(categoryId);
    if (!pattern.trim()) {
      throw new DomainError("Pattern must not be empty");
    }
    try {
      // eslint-disable-next-line no-new -- validation only
      new RegExp(pattern, "i");
    } catch {
      throw new DomainError(`Invalid regex pattern: "${pattern}"`);
    }
    return new CategoryRule(CategoryRuleId(id), pattern, CategoryId(categoryId), source);
  }

  equals(other: CategoryRule): boolean {
    return this.id === other.id;
  }
}
