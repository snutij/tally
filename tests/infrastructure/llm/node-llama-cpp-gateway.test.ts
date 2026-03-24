import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationError } from "../../../src/application/error.js";
import { InfrastructureError } from "../../../src/infrastructure/error.js";
import { NodeLlamaCppGateway } from "../../../src/infrastructure/llm/node-llama-cpp-gateway.js";

const mocks = vi.hoisted(() => {
  const mockSession = { prompt: vi.fn() };
  const mockContext = { getSequence: vi.fn().mockReturnValue({}) };
  const mockGrammar = { parse: vi.fn((raw: string) => JSON.parse(raw)) };
  const mockModel = { createContext: vi.fn().mockResolvedValue(mockContext) };
  const mockLlama = {
    createGrammarForJsonSchema: vi.fn().mockResolvedValue(mockGrammar),
    loadModel: vi.fn().mockResolvedValue(mockModel),
  };
  return { mockContext, mockGrammar, mockLlama, mockModel, mockSession };
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node-llama-cpp", () => {
  function MockLlamaChatSession(): typeof mocks.mockSession {
    return mocks.mockSession;
  }
  return {
    LlamaChatSession: MockLlamaChatSession,
    getLlama: vi.fn().mockResolvedValue(mocks.mockLlama),
  };
});

const schema = { properties: { result: { type: "string" } }, type: "object" };

describe("NodeLlamaCppGateway", () => {
  let gateway: NodeLlamaCppGateway;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.mockModel.createContext.mockResolvedValue(mocks.mockContext);
    mocks.mockLlama.createGrammarForJsonSchema.mockResolvedValue(mocks.mockGrammar);
    mocks.mockLlama.loadModel.mockResolvedValue(mocks.mockModel);
    mocks.mockGrammar.parse.mockImplementation((raw: string) => JSON.parse(raw));

    gateway = new NodeLlamaCppGateway();

    const { existsSync: mockExists } = await import("node:fs");
    vi.mocked(mockExists).mockReturnValue(true);
  });

  it("returns parsed response on success", async () => {
    mocks.mockSession.prompt.mockResolvedValue(JSON.stringify({ result: "food" }));

    const result = await gateway.complete("system", "user prompt", schema);

    expect(result).toEqual({ result: "food" });
  });

  it("throws InfrastructureError when model not found", async () => {
    const { existsSync: mockExists } = await import("node:fs");
    vi.mocked(mockExists).mockReturnValue(false);

    const fresh = new NodeLlamaCppGateway();
    await expect(fresh.complete("system", "user prompt", schema)).rejects.toThrow(
      InfrastructureError,
    );
    await expect(fresh.complete("system", "user prompt", schema)).rejects.toThrow(
      "Model not found. Run `tally init` to download it.",
    );
  });

  it("loads from custom path via TALLY_LLM_MODEL env var", async () => {
    const customPath = "/custom/path/model.gguf";
    process.env["TALLY_LLM_MODEL"] = customPath;

    const { existsSync: mockExists } = await import("node:fs");
    vi.mocked(mockExists).mockImplementation((filePath) => filePath === customPath);

    mocks.mockSession.prompt.mockResolvedValue(JSON.stringify({ result: "ok" }));

    await gateway.complete("system", "user prompt", schema);

    expect(mockExists).toHaveBeenCalledWith(customPath);

    delete process.env["TALLY_LLM_MODEL"];
  });

  it("throws ApplicationError for empty user prompt", async () => {
    await expect(gateway.complete("system", "", schema)).rejects.toThrow(ApplicationError);
    await expect(gateway.complete("system", "   ", schema)).rejects.toThrow(ApplicationError);
  });

  it("throws InfrastructureError on schema validation failure", async () => {
    mocks.mockSession.prompt.mockResolvedValue('{"result": 42}');
    mocks.mockGrammar.parse.mockImplementation(() => {
      throw new Error("expected string, got number");
    });

    await expect(gateway.complete("system", "user prompt", schema)).rejects.toThrow(
      InfrastructureError,
    );
  });

  it("throws InfrastructureError when session.prompt fails", async () => {
    mocks.mockSession.prompt.mockRejectedValue(new Error("GPU error"));

    await expect(gateway.complete("system", "user prompt", schema)).rejects.toThrow(
      InfrastructureError,
    );
    await expect(gateway.complete("system", "user prompt", schema)).rejects.toThrow(
      "LLM inference failed: GPU error",
    );
  });

  it("reuses cached model on second call", async () => {
    mocks.mockSession.prompt.mockResolvedValue(JSON.stringify({ result: "food" }));

    await gateway.complete("system", "user prompt", schema);
    await gateway.complete("system", "user prompt", schema);

    expect(mocks.mockLlama.loadModel).toHaveBeenCalledOnce();
  });
});
