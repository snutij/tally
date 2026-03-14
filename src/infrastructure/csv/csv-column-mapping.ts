export type ColumnField =
  | "date"
  | "label"
  | "amount"
  | "expense"
  | "income"
  | "category"
  | "ignore";

export interface CsvColumnMappingParams {
  fields: ColumnField[];
  dateFormat: string;
  decimalSeparator: "," | ".";
  delimiter: string;
}

export class CsvColumnMapping {
  readonly fields: ColumnField[];
  readonly dateFormat: string;
  readonly decimalSeparator: "," | ".";
  readonly delimiter: string;

  constructor(params: CsvColumnMappingParams) {
    if (!params.fields.includes("date")) {
      throw new Error("CsvColumnMapping requires a 'date' field");
    }
    if (!params.fields.includes("label")) {
      throw new Error("CsvColumnMapping requires a 'label' field");
    }
    const hasAmount =
      params.fields.includes("amount") ||
      params.fields.includes("expense") ||
      params.fields.includes("income");
    if (!hasAmount) {
      throw new Error("CsvColumnMapping requires an 'amount', 'expense', or 'income' field");
    }
    this.fields = params.fields;
    this.dateFormat = params.dateFormat;
    this.decimalSeparator = params.decimalSeparator;
    this.delimiter = params.delimiter;
  }
}
