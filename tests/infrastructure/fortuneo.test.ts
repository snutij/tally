import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { FortuneoImporter } from "../../src/infrastructure/bank/fortuneo.js";

describe("FortuneoImporter", () => {
  const importer = new FortuneoImporter();
  const fixturePath = join(import.meta.dirname, "../fixtures/fortuneo-sample.csv");

  it("has correct bank name", () => {
    expect(importer.bankName).toBe("fortuneo");
  });

  it("parses CSV into transactions", () => {
    const transactions = importer.parse(fixturePath);
    expect(transactions).toHaveLength(4);
  });

  it("parses debit amounts as negative", () => {
    const transactions = importer.parse(fixturePath);
    expect(transactions[0].amount.cents).toBe(-75000);
  });

  it("parses credit amounts as positive", () => {
    const transactions = importer.parse(fixturePath);
    const salaire = transactions[2];
    expect(salaire.amount.cents).toBe(280000);
  });

  it("sets sourceBank", () => {
    const transactions = importer.parse(fixturePath);
    expect(transactions[0].sourceBank).toBe("fortuneo");
  });
});
