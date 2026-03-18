import type { Category } from "../../domain/value-object/category.js";

export interface CategoryRepository {
  findAll(): Category[];
}
