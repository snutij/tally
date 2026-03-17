import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";
import { DomainError } from "../../domain/error/index.js";

export class RemoveRule {
  private readonly ruleRepo: CategoryRuleRepository;

  constructor(ruleRepo: CategoryRuleRepository) {
    this.ruleRepo = ruleRepo;
  }

  execute(pattern: string): boolean {
    if (!pattern.trim()) {
      throw new DomainError("pattern: must not be empty");
    }
    if (!this.ruleRepo.findByPattern(pattern)) {
      return false;
    }
    this.ruleRepo.removeByPattern(pattern);
    return true;
  }
}
