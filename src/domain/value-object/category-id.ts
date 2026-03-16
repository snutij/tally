export class CategoryId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static from(value: string): CategoryId {
    return new CategoryId(value);
  }

  equals(other: CategoryId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
