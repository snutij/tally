declare const __brand: unique symbol;
type Brand<Base, Label extends string> = Base & { readonly [__brand]: Label };

export type CategoryId = Brand<string, "CategoryId">;

export function CategoryId(value: string): CategoryId {
  return value as CategoryId;
}
