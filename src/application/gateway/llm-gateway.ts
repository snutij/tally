export interface LlmGateway {
  complete<TResult>(systemPrompt: string, userPrompt: string, schema: object): Promise<TResult>;
}
