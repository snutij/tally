import type { CategoryRule } from "../../domain/entity/category-rule.js";
import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";

export class ListRules {
  private readonly ruleRepo: CategoryRuleRepository;

  constructor(ruleRepo: CategoryRuleRepository) {
    this.ruleRepo = ruleRepo;
  }

  findAll(): CategoryRule[] {
    return this.ruleRepo.findAll();
  }
}
