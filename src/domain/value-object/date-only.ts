export class DateOnly {
  private constructor(readonly value: string) {}

  static from(input: string | Date): DateOnly {
    const str =
      input instanceof Date ? input.toISOString().slice(0, 10) : input;
    return new DateOnly(str);
  }

  toDate(): Date {
    return new Date(this.value);
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
