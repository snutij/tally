import { CategoryGroup } from "../value-object/category-group.js";

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly group: CategoryGroup;
}
