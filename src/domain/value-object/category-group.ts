export const CategoryGroup = {
  NEEDS: "NEEDS",
  WANTS: "WANTS",
  INVESTMENTS: "INVESTMENTS",
  INCOME: "INCOME",
} as const;

export type CategoryGroup = (typeof CategoryGroup)[keyof typeof CategoryGroup];
