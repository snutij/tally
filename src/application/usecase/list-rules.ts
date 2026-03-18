import { type CategoryRuleDto, toCategoryRuleDto } from "../dto/category-rule-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import type { RuleBookRepository } from "../gateway/rule-book-repository.js";

export class ListRules {
  private readonly ruleBookRepository: RuleBookRepository;
  private readonly registry: CategoryRegistry;

  constructor(ruleBookRepository: RuleBookRepository, registry: CategoryRegistry) {
    this.ruleBookRepository = ruleBookRepository;
    this.registry = registry;
  }

  execute(): CategoryRuleDto[] {
    return this.ruleBookRepository
      .load()
      .allRules()
      .map((rule) => toCategoryRuleDto(rule, this.registry));
  }
}
