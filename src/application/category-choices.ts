import { CategoryGroup } from "../domain/value-object/category-group.js";
import { DEFAULT_CATEGORIES } from "../domain/default-categories.js";

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

export function getCategoryChoiceGroups(): CategoryChoiceGroup[] {
  return Object.values(CategoryGroup).map((group) => ({
    categories: DEFAULT_CATEGORIES.filter((cat) => cat.group === group).map((cat) => ({
      id: cat.id,
      name: cat.name,
    })),
    groupKey: group,
    label: GROUP_LABELS[group] ?? group,
  }));
}
