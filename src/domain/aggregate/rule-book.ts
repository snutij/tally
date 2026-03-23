import type { CategoryRule } from "../entity/category-rule.js";
import { DomainError } from "../error/index.js";

export class RuleBook {
  private readonly rules: CategoryRule[];

  constructor(rules: CategoryRule[]) {
    this.rules = [...rules];
  }

  /**
   * Returns the matching categoryId for the given label, with learned rules
   * taking precedence over default rules. Returns undefined if no rule matches.
   */
  match(label: string): string | undefined {
    // Precedence: learned > suggested > default
    const sorted: CategoryRule[] = [
      ...this.rules.filter((rule) => rule.source === "learned"),
      ...this.rules.filter((rule) => rule.source === "suggested"),
      ...this.rules.filter((rule) => rule.source === "default"),
    ];

    for (const rule of sorted) {
      try {
        if (new RegExp(rule.pattern, "i").test(label)) {
          return rule.categoryId;
        }
      } catch {
        // invalid stored pattern — skip gracefully
      }
    }
    return undefined;
  }

  /**
   * Adds a rule to the book. Throws DomainError if a rule with the same
   * pattern already exists.
   */
  addRule(rule: CategoryRule): void {
    if (this.rules.some((existing) => existing.pattern === rule.pattern)) {
      throw new DomainError(`A rule for pattern "${rule.pattern}" already exists.`);
    }
    this.rules.push(rule);
  }

  /**
   * Removes a rule by pattern. Throws DomainError if no rule with that
   * pattern exists.
   */
  removeByPattern(pattern: string): void {
    const idx = this.rules.findIndex((rule) => rule.pattern === pattern);
    if (idx === -1) {
      throw new DomainError(`No rule found for pattern "${pattern}".`);
    }
    this.rules.splice(idx, 1);
  }

  findByPattern(pattern: string): CategoryRule | undefined {
    return this.rules.find((rule) => rule.pattern === pattern);
  }

  allRules(): readonly CategoryRule[] {
    return this.rules;
  }
}
