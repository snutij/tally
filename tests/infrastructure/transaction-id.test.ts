import { describe, expect, it } from "vitest";
import { deterministicTransactionId } from "../../src/infrastructure/bank/transaction-id.js";

describe("deterministicTransactionId", () => {
  it("returns a 32-char hex string", () => {
    const id = deterministicTransactionId("bank", "2026-03-01", "Label", -5000, 0);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is deterministic — same input gives same output", () => {
    const a = deterministicTransactionId("bank", "2026-03-01", "Rent", -80000, 0);
    const b = deterministicTransactionId("bank", "2026-03-01", "Rent", -80000, 0);
    expect(a).toBe(b);
  });

  it("produces different IDs for different inputs", () => {
    const a = deterministicTransactionId("bank", "2026-03-01", "Rent", -80000, 0);
    const b = deterministicTransactionId("bank", "2026-03-01", "Rent", -80000, 1);
    const c = deterministicTransactionId("bank", "2026-03-01", "Groceries", -80000, 0);
    const d = deterministicTransactionId("other", "2026-03-01", "Rent", -80000, 0);
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it("handles empty strings", () => {
    const id = deterministicTransactionId("", "", "", 0, 0);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("handles special characters in label", () => {
    const id = deterministicTransactionId("bank", "2026-03-01", "Café résumé €100", -10000, 0);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
