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
    // Learned rules take precedence: try them before defaults
    const sorted: CategoryRule[] = [
      ...this.rules.filter((rule) => rule.source === "learned"),
      ...this.rules.filter((rule) => rule.source === "default"),
    ];

    for (const rule of sorted) {
      let regex: RegExp;
      try {
        regex = new RegExp(rule.pattern, "i");
      } catch {
        // invalid stored pattern — skip gracefully
        // eslint-disable-next-line no-continue -- intentional skip of invalid patterns
        continue;
      }
      if (regex.test(label)) {
        return rule.categoryId;
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

  allRules(): readonly CategoryRule[] {
    return this.rules;
  }
}
