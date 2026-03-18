import { andSpec, notSpec, orSpec } from "./composite-specifications.js";
import type { CategoryId } from "../value-object/category-id.js";
import type { CategoryRule } from "../entity/category-rule.js";
import type { CategoryRuleId } from "../value-object/category-rule-id.js";
import type { Specification } from "./specification.js";

export class CategoryRuleSpecification implements Specification<string> {
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

  and(other: Specification<string>): Specification<string> {
    return andSpec(this, other);
  }

  or(other: Specification<string>): Specification<string> {
    return orSpec(this, other);
  }

  not(): Specification<string> {
    return notSpec(this);
  }
}
