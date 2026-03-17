import type { Category } from "../entity/category.js";
import { DomainError } from "../error/index.js";

export class CategoryRegistry {
  private readonly validIds: ReadonlySet<string>;

  constructor(categories: readonly Category[]) {
    this.validIds = new Set(categories.map((cat) => cat.id));
  }

  has(categoryId: string): boolean {
    return this.validIds.has(categoryId);
  }

  assertValid(categoryId: string): void {
    if (!this.validIds.has(categoryId)) {
      throw new DomainError(`Unknown category ID: "${categoryId}"`);
    }
  }
}
