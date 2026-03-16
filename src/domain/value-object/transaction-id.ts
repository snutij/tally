declare const __brand: unique symbol;
type Brand<Base, Label extends string> = Base & { readonly [__brand]: Label };

export type TransactionId = Brand<string, "TransactionId">;

export function TransactionId(value: string): TransactionId {
  return value as TransactionId;
}
