import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_MODEL = {
  contextSize: 4096,
  huggingFaceFilename: "qwen2.5-3b-instruct-q4_k_m.gguf",
  huggingFaceRepo: "Qwen/Qwen2.5-3B-Instruct-GGUF",
  // node-llama-cpp prefixes "hf_{org}_" when saving HuggingFace models locally
  localFilename: "hf_Qwen_qwen2.5-3b-instruct-q4_k_m.gguf",
};

export function resolveModelPath(): string {
  if (process.env["TALLY_LLM_MODEL"]) {
    return process.env["TALLY_LLM_MODEL"];
  }
  return join(homedir(), ".local", "share", "tally", "models", DEFAULT_MODEL.localFilename);
}

export function resolveModelUri(): string {
  return `hf:${DEFAULT_MODEL.huggingFaceRepo}/${DEFAULT_MODEL.huggingFaceFilename}`;
}

export function resolveModelsDir(): string {
  if (process.env["TALLY_LLM_MODEL"]) {
    return dirname(process.env["TALLY_LLM_MODEL"]);
  }
  return join(homedir(), ".local", "share", "tally", "models");
}
