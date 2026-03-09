import { InvalidCsvData } from "../../domain/error/index.js";
import { DateOnly } from "../../domain/value-object/date-only.js";

export function parseFrenchDate(dateStr: string): DateOnly {
  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    throw new InvalidCsvData(`expected DD/MM/YYYY date, got "${dateStr}"`);
  }
  const [day, month, year] = parts;
  const y = Number.parseInt(year, 10);
  const m = Number.parseInt(month, 10);
  const d = Number.parseInt(day, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    throw new InvalidCsvData(`non-numeric date components in "${dateStr}"`);
  }
  return DateOnly.from(`${year}-${month}-${day}`);
}

export function parseEuroAmount(str: string): number {
  const cleaned = str.replaceAll(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  if (isNaN(value)) {
    throw new InvalidCsvData(`expected numeric amount, got "${str}"`);
  }
  return value;
}
