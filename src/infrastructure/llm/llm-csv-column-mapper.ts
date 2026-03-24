import { type ColumnField, validateFields } from "../../application/dto/csv-mapping-config.js";
import { ApplicationError } from "../../application/error.js";
import type { CsvColumnMapper } from "../../application/gateway/csv-column-mapper.js";
import type { LlmGateway } from "../../application/gateway/llm-gateway.js";

const AVAILABLE_FIELDS: ColumnField[] = ["date", "label", "amount", "expense", "income", "ignore"];

const SYSTEM_PROMPT = `You are a CSV column detector for personal finance bank exports.
Given CSV column headers and sample rows, return a JSON array mapping each column index (0-based) to a semantic field.
Available fields: ${AVAILABLE_FIELDS.join(", ")}.
Use "ignore" for columns that do not map to any semantic field (e.g. balance, reference number, value date).
Respond with a JSON array of exactly the same length as the number of columns, e.g.: ["date", "label", "amount", "ignore"]`;

function buildUserPrompt(headers: string[], sampleRows: string[][]): string {
  const headerLine = headers.map((header, idx) => `${idx}: "${header}"`).join(", ");
  const sampleLines = sampleRows
    .slice(0, 5)
    .map((row) => `  [${row.map((val) => `"${val}"`).join(", ")}]`)
    .join("\n");

  return `Headers: ${headerLine}\nSample rows:\n${sampleLines}`;
}

function buildSchema(columnCount: number): object {
  return {
    items: { enum: AVAILABLE_FIELDS, type: "string" },
    maxItems: columnCount,
    minItems: columnCount,
    type: "array",
  };
}

export class LlmCsvColumnMapper implements CsvColumnMapper {
  private readonly llmGateway: LlmGateway;

  constructor(llmGateway: LlmGateway) {
    this.llmGateway = llmGateway;
  }

  async detectColumns(headers: string[], sampleRows: string[][]): Promise<ColumnField[]> {
    if (headers.length === 0) {
      throw new ApplicationError("Cannot detect columns: no headers provided.");
    }

    const fields = await this.llmGateway.complete<ColumnField[]>(
      SYSTEM_PROMPT,
      buildUserPrompt(headers, sampleRows),
      buildSchema(headers.length),
    );

    const error = validateFields(fields);
    if (error) {
      throw new ApplicationError(error);
    }

    return fields;
  }
}
