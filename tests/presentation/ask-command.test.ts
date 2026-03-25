import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AskQuestionUseCase } from "../../src/application/usecase/ask-question.js";
import { Command } from "commander";
import { createAskCommand } from "../../src/presentation/command/ask-command.js";

describe("createAskCommand", () => {
  const mockAskQuestion = { execute: vi.fn() };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = 0;
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createAskCommand(mockAskQuestion as unknown as AskQuestionUseCase);
    return new Command().addCommand(cmd).parseAsync(["node", "tally", "ask", ...args]);
  }

  it("calls execute with the question and prints the answer", async () => {
    mockAskQuestion.execute.mockResolvedValue("You spent €42 on groceries.");

    await run("How much on groceries?");

    expect(mockAskQuestion.execute).toHaveBeenCalledWith("How much on groceries?");
    expect(console.log).toHaveBeenCalledWith("You spent €42 on groceries.");
  });

  it("prints multi-word question as a single argument", async () => {
    mockAskQuestion.execute.mockResolvedValue("Your savings rate is 22%.");

    await run("What is my savings rate?");

    expect(mockAskQuestion.execute).toHaveBeenCalledWith("What is my savings rate?");
  });

  it("re-throws errors from execute", async () => {
    const boom = new Error("LLM failed");
    mockAskQuestion.execute.mockRejectedValue(boom);

    await expect(run("What?")).rejects.toThrow("LLM failed");
  });
});
