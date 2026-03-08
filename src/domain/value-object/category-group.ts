export const CategoryGroup = {
  NEEDS: "NEEDS",
  WANTS: "WANTS",
  INVESTMENTS: "INVESTMENTS",
} as const;

export type CategoryGroup = (typeof CategoryGroup)[keyof typeof CategoryGroup];
