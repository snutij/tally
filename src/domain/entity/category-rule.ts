import { CategoryId } from "../value-object/category-id.js";
import { CategoryRuleId } from "../value-object/category-rule-id.js";
import { DomainError } from "../error/index.js";

export type CategoryRuleSource = "default" | "learned";

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

  /**
   * Factory for creating new rules (e.g. from user input or config).
   * Validates structural invariants: non-empty pattern, valid regex.
   * Category existence validation is the caller's responsibility.
   */
  static create(
    id: string,
    pattern: string,
    categoryId: string,
    source: CategoryRuleSource,
  ): CategoryRule {
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

  /**
   * Factory for reconstituting rules from persistent storage.
   * Skips all validation — the database is trusted via FK constraints.
   */
  static reconstitute(
    id: string,
    pattern: string,
    categoryId: string,
    source: CategoryRuleSource,
  ): CategoryRule {
    return new CategoryRule(CategoryRuleId(id), pattern, CategoryId(categoryId), source);
  }

  equals(other: CategoryRule): boolean {
    return this.id === other.id;
  }
}
