export class Money {
  readonly cents: number;

  private constructor(cents: number) {
    this.cents = cents;
  }

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new TypeError("Money must be an integer number of cents");
    }
    return new Money(cents);
  }

  static fromEuros(euros: number): Money {
    return Money.fromCents(Math.round(euros * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  negate(): Money {
    return new Money(-this.cents);
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  toEuros(): number {
    return this.cents / 100;
  }

  toJSON(): number {
    return this.toEuros();
  }

  format(): string {
    const euros = Math.abs(this.cents) / 100;
    const sign = this.cents < 0 ? "-" : "";
    return `${sign}${euros.toFixed(2)}`;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }
}
