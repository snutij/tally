import type { Category } from "../../domain/value-object/category.js";
import type { CategoryId } from "../../domain/value-object/category-id.js";

export interface CategoryRepository {
  findAll(): Category[];
  findById(id: CategoryId): Category | undefined;
}
