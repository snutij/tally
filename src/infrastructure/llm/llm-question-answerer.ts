import {
  NARRATION_SCHEMA,
  type NarrationResult,
  SQL_GENERATION_SCHEMA,
  type SqlGenerationResult,
  buildNarrationSystemPrompt,
  buildNarrationUserPrompt,
  buildSqlGenerationSystemPrompt,
  buildSqlGenerationUserPrompt,
  buildSqlRetryUserPrompt,
} from "./ask-question-prompts.js";
import { InfrastructureError } from "../error.js";
import type { LlmGateway } from "../../application/gateway/llm-gateway.js";
import type { QuestionAnswerer } from "../../application/gateway/question-answerer.js";
import type { SchemaIntrospector } from "../../application/gateway/schema-introspector.js";
import type { SqlQueryRunner } from "../../application/gateway/sql-query-runner.js";

const MAX_RESULT_ROWS = 50;
const FALLBACK_MESSAGE = "I couldn't answer that question. Try rephrasing it.";
const NO_DATA_MESSAGE = "I found no transactions matching that query.";

export class LlmQuestionAnswerer implements QuestionAnswerer {
  private readonly llmGateway: LlmGateway;
  private readonly sqlQueryRunner: SqlQueryRunner;
  private readonly schemaIntrospector: SchemaIntrospector;

  constructor(
    llmGateway: LlmGateway,
    sqlQueryRunner: SqlQueryRunner,
    schemaIntrospector: SchemaIntrospector,
  ) {
    this.llmGateway = llmGateway;
    this.sqlQueryRunner = sqlQueryRunner;
    this.schemaIntrospector = schemaIntrospector;
  }

  async answer(question: string): Promise<string> {
    const schemaContext = await this.schemaIntrospector.getSchemaContext();
    const today = Temporal.Now.plainDateISO().toString();
    const systemPrompt = buildSqlGenerationSystemPrompt(schemaContext, today);

    // First attempt
    let rows: Record<string, unknown>[] | undefined;
    let lastError = "";

    const firstResult = await this.llmGateway.complete<SqlGenerationResult>(
      systemPrompt,
      buildSqlGenerationUserPrompt(question),
      SQL_GENERATION_SCHEMA,
    );

    const firstSql = firstResult.sql?.trim() ?? "";

    if (firstSql) {
      try {
        rows = await this.sqlQueryRunner.executeReadOnly(firstSql);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    } else {
      lastError = "Generated SQL was empty.";
    }

    // Retry on failure
    if (rows === undefined) {
      const retryResult = await this.llmGateway.complete<SqlGenerationResult>(
        systemPrompt,
        buildSqlRetryUserPrompt(question, firstSql, lastError),
        SQL_GENERATION_SCHEMA,
      );

      const retrySql = retryResult.sql?.trim() ?? "";

      if (retrySql) {
        try {
          rows = await this.sqlQueryRunner.executeReadOnly(retrySql);
        } catch {
          return FALLBACK_MESSAGE;
        }
      } else {
        return FALLBACK_MESSAGE;
      }
    }

    const hasData = rows.some((row) => Object.values(row).some((val) => val !== null));
    if (!hasData) {
      return NO_DATA_MESSAGE;
    }

    // Truncate results
    const truncated = rows.length > MAX_RESULT_ROWS;
    const rowsForNarration = truncated ? rows.slice(0, MAX_RESULT_ROWS) : rows;

    // Narrate
    try {
      const narration = await this.llmGateway.complete<NarrationResult>(
        buildNarrationSystemPrompt(),
        buildNarrationUserPrompt(question, rowsForNarration, truncated),
        NARRATION_SCHEMA,
      );
      return narration.answer;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }
      return FALLBACK_MESSAGE;
    }
  }
}
