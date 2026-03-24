import { afterEach, describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import {
  resolveModelPath,
  resolveModelUri,
  resolveModelsDir,
} from "../../../src/infrastructure/llm/default-model.js";
import { homedir } from "node:os";

describe("resolveModelPath", () => {
  afterEach(() => {
    delete process.env["TALLY_LLM_MODEL"];
  });

  it("returns default path under ~/.local/share/tally/models/", () => {
    const result = resolveModelPath();
    expect(result).toBe(
      join(
        homedir(),
        ".local",
        "share",
        "tally",
        "models",
        "hf_Qwen_qwen2.5-3b-instruct-q4_k_m.gguf",
      ),
    );
  });

  it("returns custom path when TALLY_LLM_MODEL is set", () => {
    process.env["TALLY_LLM_MODEL"] = "/custom/path/model.gguf";
    expect(resolveModelPath()).toBe("/custom/path/model.gguf");
  });
});

describe("resolveModelUri", () => {
  it("returns HuggingFace URI for the default model", () => {
    expect(resolveModelUri()).toBe(
      "hf:Qwen/Qwen2.5-3B-Instruct-GGUF/qwen2.5-3b-instruct-q4_k_m.gguf",
    );
  });
});

describe("resolveModelsDir", () => {
  afterEach(() => {
    delete process.env["TALLY_LLM_MODEL"];
  });

  it("returns default models directory", () => {
    const result = resolveModelsDir();
    expect(result).toBe(join(homedir(), ".local", "share", "tally", "models"));
  });

  it("returns parent directory of custom model path when TALLY_LLM_MODEL is set", () => {
    process.env["TALLY_LLM_MODEL"] = "/custom/path/model.gguf";
    expect(resolveModelsDir()).toBe(dirname("/custom/path/model.gguf"));
  });
});
