export type ColumnField =
  | "date"
  | "label"
  | "amount"
  | "expense"
  | "income"
  | "category"
  | "ignore";

export interface CsvMappingConfig {
  fields: ColumnField[];
  dateFormat: string;
  decimalSeparator: "," | ".";
  delimiter: string;
}
