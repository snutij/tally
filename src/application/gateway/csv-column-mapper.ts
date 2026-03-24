import type { ColumnField } from "../dto/csv-mapping-config.js";

export interface CsvColumnMapper {
  detectColumns(headers: string[], sampleRows: string[][]): Promise<ColumnField[]>;
}
