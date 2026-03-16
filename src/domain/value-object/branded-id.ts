import { DomainError } from "../error/index.js";

export abstract class BrandedId {
  readonly value: string;

  protected constructor(value: string) {
    if (!value) {
      throw new DomainError(`${this.constructor.name} cannot be empty`);
    }
    this.value = value;
  }

  equals(other: BrandedId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
