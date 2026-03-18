import {
  andSpec,
  notSpec,
  orSpec,
} from "../../src/domain/specification/composite-specifications.js";
import { describe, expect, it } from "vitest";
import type { Specification } from "../../src/domain/specification/specification.js";

function literalSpec(value: string): Specification<string> {
  const spec: Specification<string> = {
    and(other: Specification<string>): Specification<string> {
      return andSpec(spec, other);
    },
    isSatisfiedBy(candidate: string): boolean {
      return candidate === value;
    },
    not(): Specification<string> {
      return notSpec(spec);
    },
    or(other: Specification<string>): Specification<string> {
      return orSpec(spec, other);
    },
  };
  return spec;
}

describe("andSpec", () => {
  it("returns true when both specs are satisfied", () => {
    const combined = andSpec(literalSpec("foo"), literalSpec("foo"));
    expect(combined.isSatisfiedBy("foo")).toBe(true);
  });

  it("returns false when left is not satisfied", () => {
    const combined = andSpec(literalSpec("bar"), literalSpec("foo"));
    expect(combined.isSatisfiedBy("foo")).toBe(false);
  });

  it("returns false when right is not satisfied", () => {
    const combined = andSpec(literalSpec("foo"), literalSpec("bar"));
    expect(combined.isSatisfiedBy("foo")).toBe(false);
  });
});

describe("orSpec", () => {
  it("returns true when left is satisfied", () => {
    const combined = orSpec(literalSpec("foo"), literalSpec("bar"));
    expect(combined.isSatisfiedBy("foo")).toBe(true);
  });

  it("returns true when right is satisfied", () => {
    const combined = orSpec(literalSpec("bar"), literalSpec("foo"));
    expect(combined.isSatisfiedBy("foo")).toBe(true);
  });

  it("returns false when neither is satisfied", () => {
    const combined = orSpec(literalSpec("bar"), literalSpec("baz"));
    expect(combined.isSatisfiedBy("foo")).toBe(false);
  });
});

describe("notSpec", () => {
  it("returns true when inner is not satisfied", () => {
    const negated = notSpec(literalSpec("bar"));
    expect(negated.isSatisfiedBy("foo")).toBe(true);
  });

  it("returns false when inner is satisfied", () => {
    const negated = notSpec(literalSpec("foo"));
    expect(negated.isSatisfiedBy("foo")).toBe(false);
  });
});

describe("deep composition", () => {
  it("andSpec result supports .and() chaining", () => {
    const combined = andSpec(literalSpec("foo"), literalSpec("foo")).and(literalSpec("foo"));
    expect(combined.isSatisfiedBy("foo")).toBe(true);
    expect(combined.isSatisfiedBy("bar")).toBe(false);
  });

  it("andSpec result supports .not()", () => {
    const combined = andSpec(literalSpec("foo"), literalSpec("foo")).not();
    expect(combined.isSatisfiedBy("foo")).toBe(false);
    expect(combined.isSatisfiedBy("bar")).toBe(true);
  });

  it("(A AND B) OR (NOT C)", () => {
    const specA = literalSpec("a");
    const specB = literalSpec("b");
    const specC = literalSpec("c");
    const combined = andSpec(specA, specB).or(notSpec(specC));
    expect(combined.isSatisfiedBy("c")).toBe(false);
    expect(combined.isSatisfiedBy("x")).toBe(true);
  });

  it("double negation via .not() method", () => {
    const combined = notSpec(literalSpec("foo")).not();
    expect(combined.isSatisfiedBy("foo")).toBe(true);
    expect(combined.isSatisfiedBy("bar")).toBe(false);
  });

  it("orSpec result supports .and()", () => {
    const combined = orSpec(literalSpec("a"), literalSpec("b")).and(literalSpec("a"));
    expect(combined.isSatisfiedBy("a")).toBe(true);
    expect(combined.isSatisfiedBy("b")).toBe(false);
  });

  it("orSpec result supports .not()", () => {
    const combined = orSpec(literalSpec("a"), literalSpec("b")).not();
    expect(combined.isSatisfiedBy("a")).toBe(false);
    expect(combined.isSatisfiedBy("c")).toBe(true);
  });

  it("orSpec result supports .or()", () => {
    const combined = orSpec(literalSpec("a"), literalSpec("b")).or(literalSpec("c"));
    expect(combined.isSatisfiedBy("c")).toBe(true);
    expect(combined.isSatisfiedBy("d")).toBe(false);
  });

  it("notSpec result supports .and()", () => {
    const combined = notSpec(literalSpec("a")).and(literalSpec("b"));
    expect(combined.isSatisfiedBy("b")).toBe(true);
    expect(combined.isSatisfiedBy("a")).toBe(false);
  });

  it("notSpec result supports .or()", () => {
    const combined = notSpec(literalSpec("a")).or(literalSpec("a"));
    expect(combined.isSatisfiedBy("a")).toBe(true);
    expect(combined.isSatisfiedBy("b")).toBe(true);
  });
});
