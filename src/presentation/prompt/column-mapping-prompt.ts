import { type ColumnField, CsvColumnMapping } from "../../infrastructure/csv/csv-column-mapping.js";
import { decodeFileContent } from "../../infrastructure/csv/encoding.js";
import { detectDateFormat } from "../../infrastructure/csv/detect-date-format.js";
import { detectDecimalSeparator } from "../../infrastructure/csv/detect-decimal-separator.js";
import { detectDelimiter } from "../../infrastructure/csv/detect-delimiter.js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";
import select from "@inquirer/select";

const FIELD_CHOICES: { name: string; value: ColumnField }[] = [
  { name: "date", value: "date" },
  { name: "label", value: "label" },
  { name: "amount (signed, positive = income)", value: "amount" },
  { name: "expense (always negative)", value: "expense" },
  { name: "income (always positive)", value: "income" },
  { name: "category", value: "category" },
  { name: "ignore", value: "ignore" },
];

const DATE_FORMAT_CHOICES = [
  { name: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { name: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { name: "YYYY-MM-DD", value: "YYYY-MM-DD" },
  { name: "DD-MM-YYYY", value: "DD-MM-YYYY" },
];

const DELIMITER_CHOICES = [
  { name: "Semicolon (;)", value: ";" },
  { name: "Comma (,)", value: "," },
  { name: "Tab", value: "\t" },
];

function validateFields(fields: ColumnField[]): string | undefined {
  if (!fields.includes("date")) {
    return "Mapping must include a 'date' column.";
  }
  if (!fields.includes("label")) {
    return "Mapping must include a 'label' column.";
  }
  const hasAmount =
    fields.includes("amount") || fields.includes("expense") || fields.includes("income");
  if (!hasAmount) {
    return "Mapping must include an 'amount' column or at least one 'expense'/'income' column.";
  }
  return undefined;
}

export async function collectColumnMapping(filePath: string): Promise<CsvColumnMapping> {
  const rawContent = decodeFileContent(readFileSync(filePath));
  const lines = rawContent.split("\n").filter((line) => line.trim().length > 0);

  // 1. Detect delimiter
  const delimResult = detectDelimiter(lines);
  const delimiter = delimResult.confident
    ? delimResult.value
    : await select({
        choices: DELIMITER_CHOICES,
        default: delimResult.value,
        message: `Could not auto-detect delimiter (best guess: "${delimResult.value}"). Choose:`,
      });

  // 2. Parse header + first few data rows
  const allRows = parse(rawContent, {
    columns: false,
    delimiter,
    skip_empty_lines: true,
    to: 6,
    trim: true,
  }) as string[][];

  const [headers, ...dataRows] = allRows;
  if (!headers || headers.length === 0) {
    throw new Error("No headers found in CSV file.");
  }
  const sampleRow = dataRows[0] ?? [];

  // 3. Column mapping — loop until validation passes
  // eslint-disable-next-line no-constant-condition -- re-prompt on validation failure
  while (true) {
    const fields: ColumnField[] = [];
    for (let idx = 0; idx < headers.length; idx += 1) {
      const header = headers[idx] ?? `col${idx + 1}`;
      const sample = sampleRow[idx] ?? "";
      const field = await select<ColumnField>({
        choices: FIELD_CHOICES,
        message: `Column ${idx + 1} (header: "${header}", sample: "${sample}") — assign to:`,
      });
      fields.push(field);
    }

    const error = validateFields(fields);
    if (error) {
      console.error(`\n${error} Please re-map the columns.\n`);
    } else {
      // 4. Auto-detect date format from samples
      const dateIdx = fields.indexOf("date");
      const dateSamples = dataRows.map((row) => row[dateIdx] ?? "");
      const dateFormatResult = detectDateFormat(dateSamples);
      const dateFormat = dateFormatResult.confident
        ? dateFormatResult.value
        : await select({
            choices: DATE_FORMAT_CHOICES,
            default: dateFormatResult.value,
            message: `Detected date format "${dateFormatResult.value}" — correct? Choose:`,
          });

      // 5. Auto-detect decimal separator from amount column samples
      const amountIdx = fields.findIndex(
        (field) => field === "amount" || field === "expense" || field === "income",
      );
      const amountSamples = amountIdx === -1 ? [] : dataRows.map((row) => row[amountIdx] ?? "");
      const decimalResult = detectDecimalSeparator(amountSamples);
      let decimalSeparator: "," | ".";
      if (decimalResult.confident) {
        decimalSeparator = decimalResult.value;
      } else {
        const answer = await select({
          choices: [
            { name: "Comma , (European: 1.234,56)", value: "," },
            { name: "Dot . (Anglo-Saxon: 1,234.56)", value: "." },
          ],
          default: decimalResult.value,
          message: "Could not detect decimal separator. Choose:",
        });
        decimalSeparator = answer as "," | ".";
      }

      return new CsvColumnMapping({ dateFormat, decimalSeparator, delimiter, fields });
    }
  }
}
