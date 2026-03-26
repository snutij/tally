import {
  buildNarrationUserPrompt,
  buildSqlRetryUserPrompt,
} from "../../../src/infrastructure/llm/ask-question-prompts.js";
import { describe, expect, it } from "vitest";

describe("buildNarrationUserPrompt", () => {
  it("uses 'No results found.' when rows array is empty", () => {
    const prompt = buildNarrationUserPrompt("How much?", [], false);
    expect(prompt).toContain("No results found.");
  });

  it("serialises rows as JSON when rows are present", () => {
    const prompt = buildNarrationUserPrompt("How much?", [{ total: 42 }], false);
    expect(prompt).toContain('"total": 42');
    expect(prompt).not.toContain("No results found.");
  });

  it("appends truncation note when truncated is true", () => {
    const prompt = buildNarrationUserPrompt("How much?", [{ total: 1 }], true);
    expect(prompt).toContain("truncated to the first 50 rows");
  });
});

describe("buildSqlRetryUserPrompt", () => {
  it("includes original question, previous SQL, and error", () => {
    const prompt = buildSqlRetryUserPrompt("How much?", "SELECT bad", "syntax error");
    expect(prompt).toContain("How much?");
    expect(prompt).toContain("SELECT bad");
    expect(prompt).toContain("syntax error");
  });
});
