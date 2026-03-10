export const CategoryGroup = {
  INCOME: "INCOME",
  INVESTMENTS: "INVESTMENTS",
  NEEDS: "NEEDS",
  WANTS: "WANTS",
} as const;

export type CategoryGroup = (typeof CategoryGroup)[keyof typeof CategoryGroup];
