export interface QuestionAnswerer {
  answer(question: string): Promise<string>;
}
