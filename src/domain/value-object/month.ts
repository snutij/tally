import { InvalidMonth } from "../error/index.js";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class Month {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static from(input: string): Month {
    if (!MONTH_REGEX.test(input)) {
      throw new InvalidMonth(input);
    }
    return new Month(input);
  }

  get year(): number {
    return Number.parseInt(this.value.slice(0, 4), 10);
  }

  get month(): number {
    return Number.parseInt(this.value.slice(5, 7), 10);
  }

  daysInMonth(): number {
    return new Date(this.year, this.month, 0).getDate();
  }

  equals(other: Month): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
