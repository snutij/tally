import { describe, expect, it } from "vitest";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DomainError } from "../../src/domain/error/index.js";
import { RuleBook } from "../../src/domain/aggregate/rule-book.js";

function rule(pattern: string, categoryId: string, source: "default" | "learned"): CategoryRule {
  return CategoryRule.create(`id-${pattern}`.slice(0, 32), pattern, categoryId, source);
}

describe("RuleBook", () => {
  describe("match()", () => {
    it("returns categoryId when a rule matches", () => {
      const book = new RuleBook([rule(String.raw`\bspotify\b`, "w06", "default")]);
      expect(book.match("PRLV SEPA SPOTIFY")).toBe("w06");
    });

    it("returns undefined when no rule matches", () => {
      const book = new RuleBook([rule(String.raw`\bspotify\b`, "w06", "default")]);
      expect(book.match("UNKNOWN MERCHANT")).toBeUndefined();
    });

    it("returns undefined for empty book", () => {
      const book = new RuleBook([]);
      expect(book.match("anything")).toBeUndefined();
    });

    it("learned rules take precedence over default rules", () => {
      const book = new RuleBook([
        rule(String.raw`\bcarrefour\b`, "n02", "default"),
        rule(String.raw`\bcarrefour\b`, "w02", "learned"),
      ]);
      expect(book.match("CARTE CB CARREFOUR CITY")).toBe("w02");
    });

    it("matching is case-insensitive", () => {
      const book = new RuleBook([rule(String.raw`\bcarrefour\b`, "n02", "default")]);
      expect(book.match("carte cb Carrefour city")).toBe("n02");
    });

    it("skips rules with invalid regex without crashing", () => {
      const book = new RuleBook([
        // Bypass factory validation to inject invalid pattern
        {
          categoryId: "n02" as never,
          id: "x",
          pattern: "[bad",
          source: "default",
        } as unknown as CategoryRule,
        rule(String.raw`\bspotify\b`, "w06", "default"),
      ]);
      expect(book.match("PRLV SEPA SPOTIFY")).toBe("w06");
    });
  });

  describe("addRule()", () => {
    it("adds a new unique rule", () => {
      const book = new RuleBook([]);
      book.addRule(rule(String.raw`\bspotify\b`, "w06", "default"));
      expect(book.allRules()).toHaveLength(1);
    });

    it("throws DomainError for duplicate pattern", () => {
      const book = new RuleBook([rule(String.raw`\bspotify\b`, "w06", "default")]);
      expect(() => book.addRule(rule(String.raw`\bspotify\b`, "w06", "learned"))).toThrow(
        DomainError,
      );
      expect(() => book.addRule(rule(String.raw`\bspotify\b`, "n01", "learned"))).toThrow(
        /already exists/,
      );
    });
  });

  describe("removeByPattern()", () => {
    it("removes a rule with the given pattern", () => {
      const book = new RuleBook([rule(String.raw`\bspotify\b`, "w06", "default")]);
      book.removeByPattern(String.raw`\bspotify\b`);
      expect(book.allRules()).toHaveLength(0);
    });

    it("throws DomainError when pattern not found", () => {
      const book = new RuleBook([]);
      expect(() => book.removeByPattern(String.raw`\bnotfound\b`)).toThrow(DomainError);
      expect(() => book.removeByPattern(String.raw`\bnotfound\b`)).toThrow(/No rule found/);
    });
  });

  describe("allRules()", () => {
    it("returns all rules", () => {
      const rules = [
        rule(String.raw`\bspotify\b`, "w06", "default"),
        rule(String.raw`\bnetflix\b`, "w06", "learned"),
      ];
      const book = new RuleBook(rules);
      expect(book.allRules()).toHaveLength(2);
    });
  });
});
