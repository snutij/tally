import { type CategoryRule, createCategoryRule } from "../../domain/entity/category-rule.js";
import { type CategoryRuleDto, toCategoryRuleDto } from "../dto/category-rule-dto.js";
import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { DomainError } from "../../domain/error/index.js";

export class AddRule {
  private readonly ruleRepo: CategoryRuleRepository;

  constructor(ruleRepo: CategoryRuleRepository) {
    this.ruleRepo = ruleRepo;
  }

  execute(pattern: string, categoryId: string): { categoryName: string; rule: CategoryRuleDto } {
    if (!pattern.trim()) {
      throw new DomainError("pattern: must not be empty");
    }

    const category = DEFAULT_CATEGORIES.find((cat) => cat.id === categoryId);
    if (!category) {
      throw new DomainError(`Unknown category ID: "${categoryId}"`);
    }

    if (this.ruleRepo.findByPattern(pattern)) {
      throw new DomainError(`A rule for pattern "${pattern}" already exists.`);
    }

    const rule: CategoryRule = createCategoryRule(pattern, categoryId, "learned");
    this.ruleRepo.save(rule);
    return { categoryName: category.name, rule: toCategoryRuleDto(rule) };
  }
}
