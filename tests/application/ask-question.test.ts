import { beforeEach, describe, expect, it, vi } from "vitest";
import { AskQuestionUseCase } from "../../src/application/usecase/ask-question.js";
import { InfrastructureError } from "../../src/infrastructure/error.js";
import type { LlmGateway } from "../../src/application/gateway/llm-gateway.js";
import { LlmQuestionAnswerer } from "../../src/infrastructure/llm/llm-question-answerer.js";
import type { QuestionAnswerer } from "../../src/application/gateway/question-answerer.js";
import type { SchemaIntrospector } from "../../src/application/gateway/schema-introspector.js";
import type { SqlQueryRunner } from "../../src/application/gateway/sql-query-runner.js";

const SCHEMA_CONTEXT =
  "## Database Schema\n\nCREATE TABLE transactions (...);\n\n## Categories\n\n  n01: Groceries (NEEDS)";

interface Mocks {
  llmGateway: LlmGateway;
  schemaIntrospector: SchemaIntrospector;
  sqlQueryRunner: SqlQueryRunner;
}

function makeMocks(): Mocks {
  const llmGateway: LlmGateway = {
    complete: vi.fn(),
  };
  const sqlQueryRunner: SqlQueryRunner = {
    executeReadOnly: vi.fn(),
  };
  const schemaIntrospector: SchemaIntrospector = {
    getSchemaContext: vi.fn().mockResolvedValue(SCHEMA_CONTEXT),
  };
  return { llmGateway, schemaIntrospector, sqlQueryRunner };
}

describe("AskQuestionUseCase", () => {
  it("delegates to QuestionAnswerer.answer()", async () => {
    const questionAnswerer: QuestionAnswerer = {
      answer: vi.fn().mockResolvedValue("You spent €42 on groceries."),
    };
    const useCase = new AskQuestionUseCase(questionAnswerer);
    const result = await useCase.execute("How much on groceries?");
    expect(result).toBe("You spent €42 on groceries.");
    expect(questionAnswerer.answer).toHaveBeenCalledWith("How much on groceries?");
  });
});

describe("LlmQuestionAnswerer", () => {
  let llmGateway: LlmGateway;
  let sqlQueryRunner: SqlQueryRunner;
  let schemaIntrospector: SchemaIntrospector;
  let answerer: LlmQuestionAnswerer;

  beforeEach(() => {
    ({ llmGateway, sqlQueryRunner, schemaIntrospector } = makeMocks());
    answerer = new LlmQuestionAnswerer(llmGateway, sqlQueryRunner, schemaIntrospector);
  });

  it("happy path: returns narrated answer", async () => {
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "count", sql: "SELECT 1 AS total" })
      .mockResolvedValueOnce({ answer: "You spent €120 on groceries." });
    vi.mocked(sqlQueryRunner.executeReadOnly).mockResolvedValue([{ total: 12_000 }]);

    const result = await answerer.answer("How much on groceries?");
    expect(result).toBe("You spent €120 on groceries.");
  });

  it("returns no-data message when SQL returns empty result", async () => {
    vi.mocked(llmGateway.complete).mockResolvedValueOnce({
      explanation: "nothing",
      sql: "SELECT * FROM transactions WHERE 1=0",
    });
    vi.mocked(sqlQueryRunner.executeReadOnly).mockResolvedValue([]);

    const result = await answerer.answer("What did I spend yesterday?");
    expect(result).toBe("I found no transactions matching that query.");
  });

  it("returns no-data message when SQL returns only null values (e.g. SUM of no rows)", async () => {
    vi.mocked(llmGateway.complete).mockResolvedValueOnce({
      explanation: "sum",
      sql: "SELECT SUM(amount_cents) / 100.0 AS total FROM transactions WHERE category_id = 'nonexistent'",
    });
    vi.mocked(sqlQueryRunner.executeReadOnly).mockResolvedValue([{ total: null }]);

    const result = await answerer.answer("How much on food?");
    expect(result).toBe("I found no transactions matching that query.");
  });

  it("retries once when first SQL fails and retry succeeds", async () => {
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "bad", sql: "SELECT bad syntax" })
      .mockResolvedValueOnce({
        explanation: "ok",
        sql: "SELECT SUM(amount_cents) FROM transactions",
      })
      .mockResolvedValueOnce({ answer: "Your total is €500." });
    vi.mocked(sqlQueryRunner.executeReadOnly)
      .mockRejectedValueOnce(new InfrastructureError("SQL query failed: near bad"))
      .mockResolvedValueOnce([{ total: 50_000 }]);

    const result = await answerer.answer("What is my total spending?");
    expect(result).toBe("Your total is €500.");
    expect(sqlQueryRunner.executeReadOnly).toHaveBeenCalledTimes(2);
  });

  it("returns fallback message when both SQL attempts fail", async () => {
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "bad", sql: "bad sql" })
      .mockResolvedValueOnce({ explanation: "bad", sql: "also bad sql" });
    vi.mocked(sqlQueryRunner.executeReadOnly)
      .mockRejectedValueOnce(new InfrastructureError("error 1"))
      .mockRejectedValueOnce(new InfrastructureError("error 2"));

    const result = await answerer.answer("Something impossible?");
    expect(result).toBe("I couldn't answer that question. Try rephrasing it.");
  });

  it("returns fallback when LLM returns empty SQL on first attempt", async () => {
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "", sql: "" })
      .mockResolvedValueOnce({ explanation: "", sql: "" });

    const result = await answerer.answer("Something unclear?");
    expect(result).toBe("I couldn't answer that question. Try rephrasing it.");
  });

  it("returns fallback when LLM returns null sql field", async () => {
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "", sql: null })
      .mockResolvedValueOnce({ explanation: "", sql: null });

    const result = await answerer.answer("Something unclear?");
    expect(result).toBe("I couldn't answer that question. Try rephrasing it.");
  });

  it("truncates results to 50 rows before narration", async () => {
    const manyRows = Array.from({ length: 75 }, (__, idx) => ({ total: idx }));
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "all", sql: "SELECT * FROM transactions" })
      .mockResolvedValueOnce({ answer: "You have many transactions." });
    vi.mocked(sqlQueryRunner.executeReadOnly).mockResolvedValue(manyRows);

    await answerer.answer("Show all transactions");

    // The narration call (second complete) should receive only 50 rows
    const [, narrationCall] = vi.mocked(llmGateway.complete).mock.calls;
    const userPrompt = narrationCall[1] as string;
    const parsedRows = JSON.parse(
      userPrompt.match(/Query results:\n([\s\S]*?)(?:\n\n\(Note|$)/)?.[1] ?? "[]",
    );
    expect(parsedRows).toHaveLength(50);
    expect(userPrompt).toContain("truncated to the first 50 rows");
  });

  it("re-throws InfrastructureError from narration step", async () => {
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "ok", sql: "SELECT 1" })
      .mockRejectedValueOnce(new InfrastructureError("LLM model not found"));
    vi.mocked(sqlQueryRunner.executeReadOnly).mockResolvedValue([{ total: 1 }]);

    await expect(answerer.answer("How much?")).rejects.toThrow("LLM model not found");
  });

  it("returns fallback when narration throws a non-InfrastructureError", async () => {
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "ok", sql: "SELECT 1" })
      .mockRejectedValueOnce(new Error("generic error"));
    vi.mocked(sqlQueryRunner.executeReadOnly).mockResolvedValue([{ total: 1 }]);

    const result = await answerer.answer("How much?");
    expect(result).toBe("I couldn't answer that question. Try rephrasing it.");
  });

  it("does not add truncation note when results are within limit", async () => {
    const fewRows = [{ total: 100 }];
    vi.mocked(llmGateway.complete)
      .mockResolvedValueOnce({ explanation: "one", sql: "SELECT * FROM transactions LIMIT 1" })
      .mockResolvedValueOnce({ answer: "One result." });
    vi.mocked(sqlQueryRunner.executeReadOnly).mockResolvedValue(fewRows);

    await answerer.answer("Show one transaction");

    const [, narrationCall] = vi.mocked(llmGateway.complete).mock.calls;
    const userPrompt = narrationCall[1] as string;
    expect(userPrompt).not.toContain("truncated");
  });
});
