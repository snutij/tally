export class TransactionId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static from(value: string): TransactionId {
    return new TransactionId(value);
  }

  equals(other: TransactionId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
