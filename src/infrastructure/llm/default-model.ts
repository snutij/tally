import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_MODEL = {
  contextSize: 4096,
  filename: "qwen2.5-3b-instruct-q4_k_m.gguf",
  huggingFaceRepo: "Qwen/Qwen2.5-3B-Instruct-GGUF",
  revision: "7dabda4d13d513e3e842b20f0d435c732f172cbe",
};

export function resolveModelPath(): string {
  if (process.env["TALLY_LLM_MODEL"]) {
    return process.env["TALLY_LLM_MODEL"];
  }
  return join(
    homedir(),
    "Library",
    "Application Support",
    "tally",
    "models",
    DEFAULT_MODEL.filename,
  );
}
