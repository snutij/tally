import type { QuestionAnswerer } from "../gateway/question-answerer.js";

export class AskQuestionUseCase {
  private readonly questionAnswerer: QuestionAnswerer;

  constructor(questionAnswerer: QuestionAnswerer) {
    this.questionAnswerer = questionAnswerer;
  }

  execute(question: string): Promise<string> {
    return this.questionAnswerer.answer(question);
  }
}
