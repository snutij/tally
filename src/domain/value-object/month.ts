import { InvalidMonth } from "../error/index.js";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class Month {
  private constructor(readonly value: string) {}

  static from(input: string): Month {
    if (!MONTH_REGEX.test(input)) {
      throw new InvalidMonth(input);
    }
    return new Month(input);
  }

  get year(): number {
    return parseInt(this.value.slice(0, 4), 10);
  }

  get month(): number {
    return parseInt(this.value.slice(5, 7), 10);
  }

  equals(other: Month): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
