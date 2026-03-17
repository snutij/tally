import type { CategoryGroup } from "../value-object/category-group.js";
import type { CategoryId } from "../value-object/category-id.js";

export interface Category {
  readonly id: CategoryId;
  readonly name: string;
  readonly group: CategoryGroup;
}
