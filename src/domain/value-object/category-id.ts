import { BrandedId } from "./branded-id.js";

export class CategoryId extends BrandedId {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): CategoryId {
    return new CategoryId(value);
  }

  override equals(other: CategoryId): boolean {
    return super.equals(other);
  }
}
