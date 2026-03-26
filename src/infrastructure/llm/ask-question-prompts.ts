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

export function buildSqlGenerationSystemPrompt(schemaContext: string, today: string): string {
  const thisMonth = today.slice(0, 7);
  const [year, month] = thisMonth.split("-").map(Number);
  const prevMonth =
    month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;

  return `You are a SQLite query generator for a personal finance CLI application.
Given a user's question, generate a valid SQLite SELECT query to answer it.

${schemaContext}

Today is ${today}. This month is ${thisMonth}. Last month is ${prevMonth}.

Rules:
- Only generate SELECT queries. Never use INSERT, UPDATE, DELETE, DROP, ALTER, or CREATE.
- Amounts are stored as amount_cents (integer). Divide by 100.0 to get the display value.
- Dates are stored as ISO strings (YYYY-MM-DD). Use substr(date, 1, 7) for month grouping.
- category_id in transactions references categories.id. Use a JOIN with categories to filter by name or group.
- When the user asks about a concept (e.g. "food", "transport"), JOIN categories and match by name — do NOT guess a category_id.
- Negative amount_cents are expenses; positive are income.

Examples:
Q: How much did I spend in total last month?
A: SELECT SUM(amount_cents) / 100.0 AS total FROM transactions WHERE amount_cents < 0 AND substr(date, 1, 7) = '${prevMonth}'

Q: How much did I spend on food this month?
A: SELECT SUM(t.amount_cents) / 100.0 AS total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE (c.name = 'Groceries' OR c.name = 'Eating out') AND substr(t.date, 1, 7) = '${thisMonth}'

Q: Which merchants did I spend the most on this month?
A: SELECT label, SUM(amount_cents) / 100.0 AS total FROM transactions WHERE amount_cents < 0 AND substr(date, 1, 7) = '${thisMonth}' GROUP BY label ORDER BY total ASC LIMIT 10`;
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
