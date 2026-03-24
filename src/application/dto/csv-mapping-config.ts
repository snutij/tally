export type ColumnField = "date" | "label" | "amount" | "expense" | "income" | "ignore";

export interface CsvMappingConfig {
  fields: ColumnField[];
  dateFormat: string;
  decimalSeparator: "," | ".";
  delimiter: string;
}

export function validateFields(fields: ColumnField[]): string | undefined {
  if (!fields.includes("date")) {
    return "Column mapping must include a 'date' column";
  }
  if (!fields.includes("label")) {
    return "Column mapping must include a 'label' column";
  }
  const hasAmount =
    fields.includes("amount") || fields.includes("expense") || fields.includes("income");
  if (!hasAmount) {
    return "Column mapping must include an 'amount', 'expense', or 'income' column";
  }
  return undefined;
}
