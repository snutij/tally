const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class DateOnly {
  private constructor(readonly value: string) {}

  static from(input: string | Date): DateOnly {
    if (input instanceof Date) {
      if (Number.isNaN(input.getTime())) {
        throw new Error("Invalid Date object");
      }
      return new DateOnly(input.toISOString().slice(0, 10));
    }

    if (!DATE_RE.test(input)) {
      throw new Error(`Invalid date format: "${input}". Expected YYYY-MM-DD.`);
    }

    // Verify the date is real (rejects Feb 30, etc.)
    const parsed = new Date(`${input}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input) {
      throw new Error(`Invalid date: "${input}" does not exist.`);
    }

    return new DateOnly(input);
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
