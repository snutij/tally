import { DateOnly } from "../../domain/value-object/date-only.js";
import { InvalidCsvData } from "../../domain/error/index.js";

export function parseFrenchDate(dateStr: string): DateOnly {
  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    throw new InvalidCsvData(`expected DD/MM/YYYY date, got "${dateStr}"`);
  }
  const [day, month, year] = parts;
  const yr = Number.parseInt(year, 10);
  const mo = Number.parseInt(month, 10);
  const dy = Number.parseInt(day, 10);
  if (Number.isNaN(yr) || Number.isNaN(mo) || Number.isNaN(dy)) {
    throw new InvalidCsvData(`non-numeric date components in "${dateStr}"`);
  }
  return DateOnly.from(`${year}-${month}-${day}`);
}

export function parseEuroAmount(str: string): number {
  const cleaned = str.replaceAll(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new InvalidCsvData(`expected numeric amount, got "${str}"`);
  }
  return value;
}
