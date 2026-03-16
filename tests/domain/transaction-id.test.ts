import { describe, expect, it } from "vitest";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

describe("TransactionId", () => {
  it("creates a TransactionId from a string", () => {
    const id = TransactionId.from("tx-001");
    expect(id.value).toBe("tx-001");
  });

  it("equals returns true for same value", () => {
    const idA = TransactionId.from("abc");
    const idB = TransactionId.from("abc");
    expect(idA.equals(idB)).toBe(true);
  });

  it("equals returns false for different values", () => {
    const idA = TransactionId.from("tx-1");
    const idB = TransactionId.from("tx-2");
    expect(idA.equals(idB)).toBe(false);
  });

  it("toString returns the raw value", () => {
    expect(TransactionId.from("mock-20261").toString()).toBe("mock-20261");
  });

  it("toJSON returns the raw value", () => {
    expect(TransactionId.from("hash-abc").toJSON()).toBe("hash-abc");
  });

  it("serializes correctly inside JSON.stringify", () => {
    const obj = { id: TransactionId.from("tx-99") };
    expect(JSON.stringify(obj)).toBe('{"id":"tx-99"}');
  });
});
