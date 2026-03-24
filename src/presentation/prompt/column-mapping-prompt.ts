import { ApplicationError } from "../../application/error.js";
import type { CsvColumnMapper } from "../../application/gateway/csv-column-mapper.js";
import type { CsvFormatDetector } from "../../application/gateway/csv-format-detector.js";
import type { CsvMappingConfig } from "../../application/dto/csv-mapping-config.js";
import { parse } from "csv-parse/sync";

export async function collectColumnMapping(
  filePath: string,
  detector: CsvFormatDetector,
  csvColumnMapper: CsvColumnMapper,
): Promise<CsvMappingConfig> {
  const rawContent = detector.readFileContent(filePath);
  const lines = rawContent.split("\n").filter((line) => line.trim().length > 0);

  // 1. Detect delimiter (throw ApplicationError if ambiguous)
  const delimResult = detector.detectDelimiter(lines);
  if (!delimResult.confident) {
    throw new ApplicationError(
      `Could not auto-detect CSV delimiter (best guess: "${delimResult.value}"). ` +
        `Set it explicitly or check the file format.`,
    );
  }
  const delimiter = delimResult.value;

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
    throw new ApplicationError("No headers found in CSV file.");
  }

  // 3. LLM column detection
  const fields = await csvColumnMapper.detectColumns(headers, dataRows);

  // 4. Print detected mapping table
  console.log("Detected column mapping:");
  for (let idx = 0; idx < headers.length; idx += 1) {
    const header = headers[idx] ?? `col${idx + 1}`;
    const sample = dataRows[0]?.[idx] ?? "";
    const field = fields[idx] ?? "ignore";
    console.log(`  [${idx + 1}] "${header}" (e.g. "${sample}") → ${field}`);
  }

  // 5. Detect date format from samples (default to DD/MM/YYYY if not confident)
  const dateIdx = fields.indexOf("date");
  if (dateIdx === -1) {
    throw new ApplicationError("LLM did not detect a date column. Cannot determine date format.");
  }
  const dateSamples = dataRows.map((row) => row[dateIdx] ?? "");
  const dateFormatResult = detector.detectDateFormat(dateSamples);
  const dateFormat = dateFormatResult.confident ? dateFormatResult.value : "DD/MM/YYYY";

  // 6. Detect decimal separator from amount column samples
  const amountIdx = fields.findIndex(
    (field) => field === "amount" || field === "expense" || field === "income",
  );
  const amountSamples = amountIdx === -1 ? [] : dataRows.map((row) => row[amountIdx] ?? "");
  const decimalResult = detector.detectDecimalSeparator(amountSamples);
  const decimalSeparator = decimalResult.value;

  return { dateFormat, decimalSeparator, delimiter, fields };
}
