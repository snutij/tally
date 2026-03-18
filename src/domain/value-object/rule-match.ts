import type { CategoryId } from "./category-id.js";
import type { CategoryRuleId } from "./category-rule-id.js";

export interface RuleMatch {
  readonly categoryId: CategoryId;
  readonly ruleId: CategoryRuleId;
}
