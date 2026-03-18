import type { CategoryRuleGateway } from "../gateway/category-rule-gateway.js";
import { DomainError } from "../../domain/error/index.js";

export class RemoveRule {
  private readonly ruleGateway: CategoryRuleGateway;

  constructor(ruleGateway: CategoryRuleGateway) {
    this.ruleGateway = ruleGateway;
  }

  execute(pattern: string): boolean {
    if (!pattern.trim()) {
      throw new DomainError("pattern: must not be empty");
    }
    if (!this.ruleGateway.findByPattern(pattern)) {
      return false;
    }
    this.ruleGateway.removeByPattern(pattern);
    return true;
  }
}
