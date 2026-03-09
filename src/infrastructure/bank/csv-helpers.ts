import { InvalidCsvData } from "../../domain/error/index.js";

export function parseFrenchDate(dateStr: string): {
  date: Date;
  isoDate: string;
} {
  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    throw new InvalidCsvData(`expected DD/MM/YYYY date, got "${dateStr}"`);
  }
  const [day, month, year] = parts;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    throw new InvalidCsvData(`non-numeric date components in "${dateStr}"`);
  }
  return {
    date: new Date(Date.UTC(y, m - 1, d)),
    isoDate: `${year}-${month}-${day}`,
  };
}

export function parseEuroAmount(str: string): number {
  const cleaned = str.replace(/\s/g, "").replace(",", ".");
  const value = parseFloat(cleaned);
  if (isNaN(value)) {
    throw new InvalidCsvData(`expected numeric amount, got "${str}"`);
  }
  return value;
}
