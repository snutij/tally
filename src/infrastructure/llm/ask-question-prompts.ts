export const SQL_GENERATION_SCHEMA = {
  additionalProperties: false,
  properties: {
    explanation: { type: "string" },
    sql: { type: "string" },
  },
  required: ["sql", "explanation"],
  type: "object",
} as const;

export interface SqlGenerationResult {
  sql: string;
  explanation: string;
}

export const NARRATION_SCHEMA = {
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
  },
  required: ["answer"],
  type: "object",
} as const;

export interface NarrationResult {
  answer: string;
}

export function buildSqlGenerationSystemPrompt(schemaContext: string): string {
  return `You are a SQLite query generator for a personal finance CLI application.
Given a user's question, generate a valid SQLite SELECT query to answer it.

${schemaContext}

Rules:
- Only generate SELECT queries. Never use INSERT, UPDATE, DELETE, DROP, ALTER, or CREATE.
- Amounts are stored as amount_cents (integer). Divide by 100.0 to get the display value.
- Dates are stored as ISO strings (YYYY-MM-DD). Use substr(date, 1, 7) for month grouping.
- category_id in transactions references categories.id. Use a JOIN or subquery to filter by category name or group.
- For "last month", use the most recent month present in the transactions table.
- For "this month", use the current month in the transactions table.

Examples:
Q: How much did I spend in total last month?
A: SELECT SUM(amount_cents) / 100.0 AS total FROM transactions WHERE amount_cents < 0 AND substr(date, 1, 7) = (SELECT MAX(substr(date, 1, 7)) FROM transactions)

Q: What did I spend on groceries in January 2026?
A: SELECT SUM(t.amount_cents) / 100.0 AS total FROM transactions t WHERE t.category_id = 'n01' AND substr(t.date, 1, 7) = '2026-01'

Q: Which merchants did I spend the most on?
A: SELECT label, SUM(amount_cents) / 100.0 AS total FROM transactions WHERE amount_cents < 0 GROUP BY label ORDER BY total ASC LIMIT 10`;
}

export function buildSqlGenerationUserPrompt(question: string): string {
  return `Question: ${question}`;
}

export function buildSqlRetryUserPrompt(
  question: string,
  previousSql: string,
  error: string,
): string {
  return `Question: ${question}

Your previous query failed:
SQL: ${previousSql}
Error: ${error}

Please generate a corrected query.`;
}

export function buildNarrationSystemPrompt(): string {
  return `You are a personal finance assistant. Given a user's question and SQL query results, provide a clear and concise plain-English answer.
Keep your answer to 2-3 sentences. Be specific with numbers. If results show no data, say so clearly.`;
}

export function buildNarrationUserPrompt(
  question: string,
  rows: Record<string, unknown>[],
  truncated: boolean,
): string {
  const resultText = rows.length === 0 ? "No results found." : JSON.stringify(rows, null, 2);
  const truncatedNote = truncated ? "\n\n(Note: results were truncated to the first 50 rows)" : "";
  return `Question: ${question}\n\nQuery results:\n${resultText}${truncatedNote}`;
}
