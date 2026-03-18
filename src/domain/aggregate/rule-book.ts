import { AggregateRoot } from "./aggregate-root.js";
import type { CategoryRule } from "../entity/category-rule.js";
import { CategoryRuleSpecification } from "../specification/category-rule-specification.js";
import { DomainError } from "../error/index.js";
import type { RuleMatch } from "../value-object/rule-match.js";
import { createCategoryRuleLearned } from "../event/category-rule-learned.js";

export class RuleBook extends AggregateRoot {
  private readonly rules: CategoryRule[];

  constructor(rules: CategoryRule[]) {
    super();
    this.rules = [...rules];
  }

  /**
   * Returns the matching categoryId and ruleId for the given label, with
   * learned rules taking precedence over default rules.
   * Returns undefined if no rule matches.
   */
  match(label: string): RuleMatch | undefined {
    // Learned rules take precedence: try them before defaults
    const sorted: CategoryRule[] = [
      ...this.rules.filter((rule) => rule.source === "learned"),
      ...this.rules.filter((rule) => rule.source === "default"),
    ];

    for (const rule of sorted) {
      const spec = new CategoryRuleSpecification(rule);
      if (spec.isSatisfiedBy(label)) {
        return { categoryId: spec.categoryId, ruleId: spec.ruleId };
      }
    }
    return undefined;
  }

  /**
   * Adds a rule to the book. Throws DomainError if a rule with the same
   * pattern already exists. Records a CategoryRuleLearned event on success.
   */
  addRule(rule: CategoryRule): void {
    if (this.rules.some((existing) => existing.pattern === rule.pattern)) {
      throw new DomainError(`A rule for pattern "${rule.pattern}" already exists.`);
    }
    this.rules.push(rule);
    this.addDomainEvent(createCategoryRuleLearned(rule.id, rule.pattern, rule.categoryId));
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
