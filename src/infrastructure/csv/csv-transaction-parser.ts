import type { CsvColumnMapping } from "./csv-column-mapping.js";
import { DateOnly } from "../../domain/value-object/date-only.js";
import { InvalidCsvData } from "../../domain/error/index.js";
import { Money } from "../../domain/value-object/money.js";
import { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionParser } from "../../application/gateway/transaction-parser.js";
import { decodeFileContent } from "./encoding.js";
import { deterministicTransactionId } from "./transaction-id.js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";

function parseDateWithFormat(dateStr: string, format: string): DateOnly {
  let day: string;
  let month: string;
  let year: string;

  if (format === "DD/MM/YYYY" || format === "DD-MM-YYYY") {
    const sep = format === "DD/MM/YYYY" ? "/" : "-";
    const parts = dateStr.split(sep);
    if (parts.length !== 3) {
      throw new InvalidCsvData(`expected ${format} date, got "${dateStr}"`);
    }
    [day, month, year] = parts as [string, string, string];
  } else if (format === "MM/DD/YYYY") {
    const parts = dateStr.split("/");
    if (parts.length !== 3) {
      throw new InvalidCsvData(`expected MM/DD/YYYY date, got "${dateStr}"`);
    }
    [month, day, year] = parts as [string, string, string];
  } else if (format === "YYYY-MM-DD") {
    const parts = dateStr.split("-");
    if (parts.length !== 3) {
      throw new InvalidCsvData(`expected YYYY-MM-DD date, got "${dateStr}"`);
    }
    [year, month, day] = parts as [string, string, string];
  } else {
    throw new InvalidCsvData(`unsupported date format: "${format}"`);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked by length above
  return DateOnly.from(`${year!}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`);
}

function parseAmountCents(str: string, decimalSeparator: "," | "."): number {
  let cleaned = str.replaceAll(/[€$£\s]/g, "");

  cleaned =
    decimalSeparator === ","
      ? cleaned.replaceAll(".", "").replace(",", ".") // European: 1.234,56 → 1234.56
      : cleaned.replaceAll(",", ""); // Anglo-Saxon: 1,234.56 → 1234.56

  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new InvalidCsvData(`expected numeric amount, got "${str}"`);
  }
  return Math.round(value * 100);
}

function resolveExpenseIncome(
  expenseStr: string,
  incomeStr: string,
  decimalSeparator: "," | ".",
): number {
  if (expenseStr.trim().length > 0) {
    return -Math.abs(parseAmountCents(expenseStr, decimalSeparator));
  }
  if (incomeStr.trim().length > 0) {
    return Math.abs(parseAmountCents(incomeStr, decimalSeparator));
  }
  return 0;
}

export class CsvTransactionParser implements TransactionParser {
  private readonly mapping: CsvColumnMapping;

  constructor(mapping: CsvColumnMapping) {
    this.mapping = mapping;
  }

  // eslint-disable-next-line class-methods-use-this -- implements TransactionParser, delegates to helpers
  parse(filePath: string): Transaction[] {
    const content = decodeFileContent(readFileSync(filePath));
    const records = parse(content, {
      columns: false,
      delimiter: this.mapping.delimiter,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];

    // Skip header row
    const [, ...dataRows] = records;
    const seen = new Map<string, number>();
    const transactions: Transaction[] = [];

    for (const row of dataRows) {
      const txn = this.parseRow(row, seen);
      if (txn !== undefined) {
        transactions.push(txn);
      }
    }

    return transactions;
  }

  private parseRow(row: string[], seen: Map<string, number>): Transaction | undefined {
    const { fields } = this.mapping;
    const dateIdx = fields.indexOf("date");
    const labelIdx = fields.indexOf("label");
    const amountIdx = fields.indexOf("amount");
    const expenseIdx = fields.indexOf("expense");
    const incomeIdx = fields.indexOf("income");

    const dateStr = row[dateIdx] ?? "";
    const label = row[labelIdx] ?? "";

    let date: DateOnly;
    try {
      date = parseDateWithFormat(dateStr, this.mapping.dateFormat);
    } catch {
      console.warn(`Skipping row with unparseable date: "${dateStr}"`);
      return undefined;
    }

    let amountCents: number;
    if (amountIdx === -1) {
      const expenseStr = expenseIdx === -1 ? "" : (row[expenseIdx] ?? "");
      const incomeStr = incomeIdx === -1 ? "" : (row[incomeIdx] ?? "");
      amountCents = resolveExpenseIncome(expenseStr, incomeStr, this.mapping.decimalSeparator);
    } else {
      amountCents = parseAmountCents(row[amountIdx] ?? "", this.mapping.decimalSeparator);
    }

    const isoDate = date.toString();
    const key = `csv|${isoDate}|${label}|${amountCents}`;
    const seq = seen.get(key) ?? 0;
    seen.set(key, seq + 1);

    return Transaction.create({
      amount: Money.fromCents(amountCents),
      date,
      id: deterministicTransactionId("csv", isoDate, label, amountCents, seq),
      label,
      source: "csv",
    });
  }
}
