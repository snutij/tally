import type { AskQuestionUseCase } from "../../application/usecase/ask-question.js";
import { Command } from "commander";
import ora from "ora";

export function createAskCommand(askQuestion: AskQuestionUseCase): Command {
  return new Command("ask")
    .description("Ask a question about your finances in plain English")
    .argument("<question>", 'Your question, e.g. "How much did I spend last month?"')
    .action(async (question: string) => {
      const spinner = ora("Thinking...").start();
      try {
        const answer = await askQuestion.execute(question);
        spinner.stop();
        console.log(answer);
      } catch (error) {
        spinner.stop();
        throw error;
      }
    });
}
