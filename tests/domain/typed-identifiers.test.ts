import { describe, expect, expectTypeOf, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRuleId } from "../../src/domain/value-object/category-rule-id.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

describe("CategoryId", () => {
  it("factory produces a string-compatible value at runtime", () => {
    const id = CategoryId("n01");
    expect(id).toBe("n01");
    expect(typeof id).toBe("string");
  });

  it("supports equality via ===", () => {
    const first = CategoryId("n01");
    const second = CategoryId("n01");
    const other = CategoryId("w02");
    expect(first === second).toBe(true);
    expect(first === other).toBe(false);
  });

  it("serializes as plain string in JSON", () => {
    const obj = { id: CategoryId("n01") };
    expect(JSON.stringify(obj)).toBe('{"id":"n01"}');
  });

  it("type: CategoryId is not assignable to TransactionId", () => {
    expectTypeOf<CategoryId>().not.toMatchTypeOf<TransactionId>();
  });

  it("type: CategoryId extends string", () => {
    expectTypeOf<CategoryId>().toExtend<string>();
  });
});

describe("CategoryRuleId", () => {
  it("factory produces a string-compatible value at runtime", () => {
    const id = CategoryRuleId("rule-abc");
    expect(id).toBe("rule-abc");
    expect(typeof id).toBe("string");
  });

  it("type: CategoryRuleId is not assignable to CategoryId", () => {
    expectTypeOf<CategoryRuleId>().not.toMatchTypeOf<CategoryId>();
  });

  it("type: CategoryRuleId extends string", () => {
    expectTypeOf<CategoryRuleId>().toExtend<string>();
  });
});

describe("TransactionId", () => {
  it("factory produces a string-compatible value at runtime", () => {
    const id = TransactionId("tx-abc");
    expect(id).toBe("tx-abc");
    expect(typeof id).toBe("string");
  });

  it("supports equality via ===", () => {
    const first = TransactionId("tx-1");
    const second = TransactionId("tx-1");
    const other = TransactionId("tx-2");
    expect(first === second).toBe(true);
    expect(first === other).toBe(false);
  });

  it("serializes as plain string in JSON", () => {
    const obj = { id: TransactionId("tx-1") };
    expect(JSON.stringify(obj)).toBe('{"id":"tx-1"}');
  });

  it("type: TransactionId is not assignable to CategoryId", () => {
    expectTypeOf<TransactionId>().not.toMatchTypeOf<CategoryId>();
  });

  it("type: TransactionId extends string", () => {
    expectTypeOf<TransactionId>().toExtend<string>();
  });
});
