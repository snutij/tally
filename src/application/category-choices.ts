import type { Category } from "../domain/value-object/category.js";
import { CategoryGroup } from "../domain/value-object/category-group.js";

export interface CategoryChoiceGroup {
  readonly categories: readonly { readonly id: string; readonly name: string }[];
  readonly groupKey: string;
  readonly label: string;
}

const GROUP_LABELS: Record<string, string> = {
  INCOME: "— Income —",
  INVESTMENTS: "— Investments —",
  NEEDS: "— Needs —",
  WANTS: "— Wants —",
};

export function buildCategoryChoices(categories: readonly Category[]): CategoryChoiceGroup[] {
  return Object.values(CategoryGroup).map((group) => ({
    categories: categories
      .filter((cat) => cat.group === group)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
      })),
    groupKey: group,
    label: GROUP_LABELS[group] ?? group,
  }));
}
