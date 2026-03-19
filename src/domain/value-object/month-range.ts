import { InvalidMonthRange } from "../error/index.js";
import { Month } from "./month.js";

export class MonthRange {
  readonly start: Month;
  readonly end: Month;

  private constructor(start: Month, end: Month) {
    this.start = start;
    this.end = end;
  }

  static from(startStr: string, endStr: string): MonthRange {
    const start = Month.from(startStr);
    const end = Month.from(endStr);
    if (start.value > end.value) {
      throw new InvalidMonthRange(startStr, endStr);
    }
    return new MonthRange(start, end);
  }

  months(): Month[] {
    const result: Month[] = [];
    let current = this.start;
    while (current.value <= this.end.value) {
      result.push(current);
      current = current.next();
    }
    return result;
  }
}
