import { describe, expect, it, vi } from "vitest";
import { ApplicationError } from "../../../src/application/error.js";
import { LlmCsvColumnMapper } from "../../../src/infrastructure/llm/llm-csv-column-mapper.js";
import type { LlmGateway } from "../../../src/application/gateway/llm-gateway.js";

const frenchSampleRows = [["15/03/2026", "CARTE CB AUCHAN", "-45,90"]];

describe("LlmCsvColumnMapper", () => {
  it("detects French bank CSV headers", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["date", "label", "amount"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    const result = await mapper.detectColumns(
      ["Date d'opération", "Libellé simplifié", "Montant"],
      frenchSampleRows,
    );

    expect(result).toEqual(["date", "label", "amount"]);
  });

  it("handles split debit/credit columns", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["date", "label", "expense", "income", "ignore"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    const result = await mapper.detectColumns(
      ["Date", "Libellé", "Débit", "Crédit", "Solde"],
      [["15/03/2026", "SNCF", "-120,00", "", "1500,00"]],
    );

    expect(result).toEqual(["date", "label", "expense", "income", "ignore"]);
  });

  it("maps unknown columns to ignore", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["date", "ignore", "label", "amount"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    const result = await mapper.detectColumns(
      ["Date", "Référence", "Libellé", "Montant"],
      [["15/03/2026", "REF123", "CARREFOUR", "-42,00"]],
    );

    expect(result).toEqual(["date", "ignore", "label", "amount"]);
  });

  it("throws ApplicationError when headers are empty", async () => {
    const mockLlm: LlmGateway = { complete: vi.fn() };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    await expect(mapper.detectColumns([], [])).rejects.toThrow(ApplicationError);
    expect(mockLlm.complete).not.toHaveBeenCalled();
  });

  it("throws ApplicationError when LLM response fails validation — missing date", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["ignore", "label", "amount"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    await expect(mapper.detectColumns(["Ref", "Libellé", "Montant"], [])).rejects.toThrow(
      ApplicationError,
    );
    await expect(mapper.detectColumns(["Ref", "Libellé", "Montant"], [])).rejects.toThrow("date");
  });

  it("throws ApplicationError when LLM response fails validation — missing amount", async () => {
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockResolvedValue(["date", "label", "ignore"]),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    await expect(mapper.detectColumns(["Date", "Libellé", "Ref"], [])).rejects.toThrow(
      ApplicationError,
    );
  });

  it("escapes embedded double quotes in headers and sample values before sending to LLM", async () => {
    let capturedPrompt = "";
    const mockLlm: LlmGateway = {
      complete: vi.fn().mockImplementation((_sys, userPrompt) => {
        capturedPrompt = userPrompt as string;
        return Promise.resolve(["date", "label", "amount"]);
      }),
    };
    const mapper = new LlmCsvColumnMapper(mockLlm);

    await mapper.detectColumns(
      ['Date "opération"', "Libellé", "Montant"],
      [["15/03/2026", 'CARTE CB "AUCHAN"', "-45,90"]],
    );

    expect(capturedPrompt).toContain(String.raw`\"opération\"`);
    expect(capturedPrompt).toContain(String.raw`\"AUCHAN\"`);
    expect(capturedPrompt).not.toMatch(/(?<!\\)(?:\\\\)*"opération"(?<!\\)/);
  });
});
