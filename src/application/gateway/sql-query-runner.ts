export interface SqlQueryRunner {
  executeReadOnly(sql: string): Promise<Record<string, unknown>[]>;
}
