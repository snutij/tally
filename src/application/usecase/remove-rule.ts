import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";

export class RemoveRule {
  private readonly ruleRepo: CategoryRuleRepository;

  constructor(ruleRepo: CategoryRuleRepository) {
    this.ruleRepo = ruleRepo;
  }

  execute(pattern: string): boolean {
    if (!this.ruleRepo.findByPattern(pattern)) {
      return false;
    }
    this.ruleRepo.removeByPattern(pattern);
    return true;
  }
}
