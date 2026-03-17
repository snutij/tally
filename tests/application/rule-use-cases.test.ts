import { beforeEach, describe, expect, it } from "vitest";
import { AddRule } from "../../src/application/usecase/add-rule.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORY_REGISTRY } from "../../src/domain/default-categories.js";
import { DomainError } from "../../src/domain/error/index.js";
import type { IdGenerator } from "../../src/application/gateway/id-generator.js";
import { InMemoryCategoryRuleRepository } from "../helpers/in-memory-repositories.js";
import { ListRules } from "../../src/application/usecase/list-rules.js";
import { RemoveRule } from "../../src/application/usecase/remove-rule.js";

const stubIdGenerator: IdGenerator = {
  fromPattern: (pattern: string) => `id-${pattern}`.slice(0, 32).padEnd(32, "-"),
};

function makeRule(
  pattern: string,
  categoryId: string,
  source: "default" | "learned",
): CategoryRule {
  return CategoryRule.create(
    stubIdGenerator.fromPattern(pattern),
    pattern,
    categoryId,
    source,
    DEFAULT_CATEGORY_REGISTRY,
  );
}

describe("ListRules", () => {
  let ruleRepo: InMemoryCategoryRuleRepository;
  let useCase: ListRules;

  beforeEach(() => {
    ruleRepo = new InMemoryCategoryRuleRepository();
    useCase = new ListRules(ruleRepo);
  });

  it("returns all rules", () => {
    ruleRepo.save(makeRule(String.raw`\bspotify\b`, "w06", "default"));
    ruleRepo.save(makeRule(String.raw`\bmonoprix\b`, "n02", "learned"));
    expect(useCase.execute()).toHaveLength(2);
  });

  it("returns empty array when no rules exist", () => {
    expect(useCase.execute()).toHaveLength(0);
  });
});

describe("AddRule", () => {
  let ruleRepo: InMemoryCategoryRuleRepository;
  let useCase: AddRule;

  beforeEach(() => {
    ruleRepo = new InMemoryCategoryRuleRepository();
    useCase = new AddRule(ruleRepo, stubIdGenerator, DEFAULT_CATEGORY_REGISTRY);
  });

  it("saves a learned rule and returns it with category name", () => {
    const { rule, categoryName } = useCase.execute(String.raw`\bmonoprix\b`, "n02");
    expect(rule.pattern).toBe(String.raw`\bmonoprix\b`);
    expect(rule.source).toBe("learned");
    expect(categoryName).toBe("Groceries");
  });

  it("persists the rule in the repository", () => {
    useCase.execute(String.raw`\bmonoprix\b`, "n02");
    expect(ruleRepo.findByPattern(String.raw`\bmonoprix\b`)).toBeDefined();
  });

  it("throws DomainError for empty pattern", () => {
    expect(() => useCase.execute("", "n02")).toThrow(DomainError);
    expect(() => useCase.execute("  ", "n02")).toThrow(/must not be empty/);
  });

  it("throws DomainError for invalid regex", () => {
    expect(() => useCase.execute("[invalid", "n02")).toThrow(DomainError);
    expect(() => useCase.execute("[invalid", "n02")).toThrow(/Invalid regex/);
  });

  it("throws DomainError for unknown category ID", () => {
    expect(() => useCase.execute(String.raw`\bfoo\b`, "nonexistent")).toThrow(DomainError);
    expect(() => useCase.execute(String.raw`\bfoo\b`, "nonexistent")).toThrow(/Unknown category/);
  });

  it("throws DomainError for duplicate pattern", () => {
    ruleRepo.save(makeRule(String.raw`\bmonoprix\b`, "n02", "default"));
    expect(() => useCase.execute(String.raw`\bmonoprix\b`, "n02")).toThrow(DomainError);
    expect(() => useCase.execute(String.raw`\bmonoprix\b`, "n02")).toThrow(/already exists/);
  });
});

describe("RemoveRule", () => {
  let ruleRepo: InMemoryCategoryRuleRepository;
  let useCase: RemoveRule;

  beforeEach(() => {
    ruleRepo = new InMemoryCategoryRuleRepository();
    useCase = new RemoveRule(ruleRepo);
  });

  it("removes an existing rule and returns true", () => {
    ruleRepo.save(makeRule(String.raw`\bspotify\b`, "w06", "default"));
    const result = useCase.execute(String.raw`\bspotify\b`);
    expect(result).toBe(true);
    expect(ruleRepo.findByPattern(String.raw`\bspotify\b`)).toBeUndefined();
  });

  it("returns false when pattern not found", () => {
    const result = useCase.execute(String.raw`\bnotfound\b`);
    expect(result).toBe(false);
  });

  it("throws DomainError for empty pattern", () => {
    expect(() => useCase.execute("")).toThrow(DomainError);
    expect(() => useCase.execute("  ")).toThrow(DomainError);
  });
});
