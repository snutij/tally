export const CategoryGroup = {
  INCOME: "INCOME",
  INVESTMENTS: "INVESTMENTS",
  NEEDS: "NEEDS",
  WANTS: "WANTS",
} as const;

export type CategoryGroup = (typeof CategoryGroup)[keyof typeof CategoryGroup];

export const EXPENSE_GROUPS: CategoryGroup[] = [
  CategoryGroup.NEEDS,
  CategoryGroup.WANTS,
  CategoryGroup.INVESTMENTS,
];
