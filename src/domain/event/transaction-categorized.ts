import type { CategoryId } from "../value-object/category-id.js";
import type { CategoryRuleId } from "../value-object/category-rule-id.js";
import type { DomainEvent } from "./domain-event.js";
import type { TransactionId } from "../value-object/transaction-id.js";

export interface TransactionCategorized extends DomainEvent {
  readonly eventType: "TransactionCategorized";
  readonly transactionId: TransactionId;
  readonly categoryId: CategoryId;
  readonly ruleId: CategoryRuleId | undefined;
}

export function createTransactionCategorized(
  transactionId: TransactionId,
  categoryId: CategoryId,
  ruleId: CategoryRuleId | undefined,
): TransactionCategorized {
  return {
    categoryId,
    eventType: "TransactionCategorized",
    occurredAt: new Date(),
    ruleId,
    transactionId,
  };
}
