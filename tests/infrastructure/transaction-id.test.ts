import { describe, expect, it } from "vitest";
import { deterministicTransactionId } from "../../src/infrastructure/bank/transaction-id.js";

describe("deterministicTransactionId", () => {
  it("returns a 32-char hex string", () => {
    const id = deterministicTransactionId("bank", "2026-03-01", "Label", -5000, 0);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is deterministic — same input gives same output", () => {
    const id1 = deterministicTransactionId("bank", "2026-03-01", "Rent", -80_000, 0);
    const id2 = deterministicTransactionId("bank", "2026-03-01", "Rent", -80_000, 0);
    expect(id1).toBe(id2);
  });

  it("produces different IDs for different inputs", () => {
    const id1 = deterministicTransactionId("bank", "2026-03-01", "Rent", -80_000, 0);
    const id2 = deterministicTransactionId("bank", "2026-03-01", "Rent", -80_000, 1);
    const id3 = deterministicTransactionId("bank", "2026-03-01", "Groceries", -80_000, 0);
    const id4 = deterministicTransactionId("other", "2026-03-01", "Rent", -80_000, 0);
    expect(new Set([id1, id2, id3, id4]).size).toBe(4);
  });

  it("handles empty strings", () => {
    const id = deterministicTransactionId("", "", "", 0, 0);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("handles special characters in label", () => {
    const id = deterministicTransactionId("bank", "2026-03-01", "Café résumé €100", -10_000, 0);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
