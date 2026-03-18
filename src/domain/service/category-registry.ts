import type { Category } from "../value-object/category.js";
import type { CategoryGroup } from "../value-object/category-group.js";
import { DomainError } from "../error/index.js";

export interface CategoryMapEntry {
  readonly group: CategoryGroup;
  readonly name: string;
}

export class CategoryRegistry {
  private readonly categories: readonly Category[];
  private readonly validIds: ReadonlySet<string>;

  constructor(categories: readonly Category[]) {
    this.categories = categories;
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

  nameOf(id: string): string | undefined {
    return this.categories.find((cat) => cat.id === id)?.name;
  }

  categoryToGroupMap(): ReadonlyMap<string, CategoryMapEntry> {
    return new Map(this.categories.map((cat) => [cat.id, { group: cat.group, name: cat.name }]));
  }

  allCategories(): readonly Category[] {
    return this.categories;
  }
}
