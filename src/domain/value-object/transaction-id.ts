import { BrandedId } from "./branded-id.js";

export class TransactionId extends BrandedId {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): TransactionId {
    return new TransactionId(value);
  }

  override equals(other: TransactionId): boolean {
    return super.equals(other);
  }
}
