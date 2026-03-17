import { type CategoryRuleDto, toCategoryRuleDto } from "../dto/category-rule-dto.js";
import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";

export class ListRules {
  private readonly ruleRepo: CategoryRuleRepository;

  constructor(ruleRepo: CategoryRuleRepository) {
    this.ruleRepo = ruleRepo;
  }

  execute(): CategoryRuleDto[] {
    return this.ruleRepo.findAll().map((rule) => toCategoryRuleDto(rule));
  }
}
