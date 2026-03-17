declare const __brand: unique symbol;
type Brand<Base, Label extends string> = Base & { readonly [__brand]: Label };

export type CategoryRuleId = Brand<string, "CategoryRuleId">;

export function CategoryRuleId(value: string): CategoryRuleId {
  return value as CategoryRuleId;
}
