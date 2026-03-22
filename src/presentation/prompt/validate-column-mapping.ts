import type { ColumnField } from "../../application/dto/csv-mapping-config.js";

export function validateFields(fields: ColumnField[]): string | undefined {
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
