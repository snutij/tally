import type { CategoryId } from "./category-id.js";
import type { CategoryRule } from "../entity/category-rule.js";
import type { CategoryRuleId } from "./category-rule-id.js";

export class CategoryRuleSpecification {
  private readonly rule: CategoryRule;

  constructor(rule: CategoryRule) {
    this.rule = rule;
  }

  get categoryId(): CategoryId {
    return this.rule.categoryId;
  }

  get ruleId(): CategoryRuleId {
    return this.rule.id;
  }

  isSatisfiedBy(label: string): boolean {
    let regex: RegExp;
    try {
      regex = new RegExp(this.rule.pattern, "i");
    } catch {
      return false;
    }
    return regex.test(label);
  }
}
