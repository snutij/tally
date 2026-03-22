import type { ColumnField, CsvMappingConfig } from "../../application/dto/csv-mapping-config.js";
import type { CsvFormatDetector } from "../../application/gateway/csv-format-detector.js";
import { parse } from "csv-parse/sync";
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

export async function collectColumnMapping(
  filePath: string,
  detector: CsvFormatDetector,
): Promise<CsvMappingConfig> {
  const rawContent = detector.readFileContent(filePath);
  const lines = rawContent.split("\n").filter((line) => line.trim().length > 0);

  // 1. Detect delimiter
  const delimResult = detector.detectDelimiter(lines);
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
  let validationError: string | undefined = undefined;
  do {
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

    validationError = validateFields(fields);
    if (validationError) {
      console.error(`\n${validationError} Please re-map the columns.\n`);
    } else {
      // 4. Auto-detect date format from samples
      const dateIdx = fields.indexOf("date");
      const dateSamples = dataRows.map((row) => row[dateIdx] ?? "");
      const dateFormatResult = detector.detectDateFormat(dateSamples);
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
      const decimalResult = detector.detectDecimalSeparator(amountSamples);
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

      return { dateFormat, decimalSeparator, delimiter, fields };
    }
  } while (validationError);
}
