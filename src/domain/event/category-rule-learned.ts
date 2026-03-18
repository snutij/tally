import type { CategoryId } from "../value-object/category-id.js";
import type { CategoryRuleId } from "../value-object/category-rule-id.js";
import type { DomainEvent } from "./domain-event.js";

export interface CategoryRuleLearned extends DomainEvent {
  readonly eventType: "CategoryRuleLearned";
  readonly ruleId: CategoryRuleId;
  readonly pattern: string;
  readonly categoryId: CategoryId;
}

export function CategoryRuleLearned(
  ruleId: CategoryRuleId,
  pattern: string,
  categoryId: CategoryId,
): CategoryRuleLearned {
  return { categoryId, eventType: "CategoryRuleLearned", occurredAt: new Date(), pattern, ruleId };
}
