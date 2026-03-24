import { DEFAULT_MODEL, resolveModelPath } from "./default-model.js";
import { type Llama, LlamaChatSession, type LlamaModel, getLlama } from "node-llama-cpp";
import { ApplicationError } from "../../application/error.js";
import { InfrastructureError } from "../error.js";
import type { LlmGateway } from "../../application/gateway/llm-gateway.js";
import { existsSync } from "node:fs";

export class NodeLlamaCppGateway implements LlmGateway {
  private llama: Llama | null = null;
  private model: LlamaModel | null = null;

  async complete<TResult>(
    systemPrompt: string,
    userPrompt: string,
    schema: object,
  ): Promise<TResult> {
    if (!userPrompt.trim()) {
      throw new ApplicationError("User prompt must not be empty.");
    }

    const { llama, model } = await this.loadModel();

    const grammar = await llama.createGrammarForJsonSchema(schema);

    const context = await model.createContext({
      contextSize: DEFAULT_MODEL.contextSize,
    });

    try {
      const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt,
      });

      let raw: string;
      try {
        raw = await session.prompt(userPrompt, { grammar });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new InfrastructureError(`LLM inference failed: ${msg}`);
      }

      try {
        return grammar.parse(raw) as TResult;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new InfrastructureError(`LLM response failed schema validation: ${msg}`);
      }
    } finally {
      await context.dispose();
    }
  }

  private async loadModel(): Promise<{ llama: Llama; model: LlamaModel }> {
    if (this.llama && this.model) {
      return { llama: this.llama, model: this.model };
    }

    const modelPath = resolveModelPath();

    if (!existsSync(modelPath)) {
      throw new InfrastructureError("Model not found. Run `tally init` to download it.");
    }

    this.llama = await getLlama({ gpu: "auto" });
    this.model = await this.llama.loadModel({ modelPath });

    return { llama: this.llama, model: this.model };
  }
}
