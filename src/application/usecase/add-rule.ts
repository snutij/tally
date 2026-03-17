import { type CategoryRuleDto, toCategoryRuleDto } from "../dto/category-rule-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { CategoryRule } from "../../domain/entity/category-rule.js";
import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { DomainError } from "../../domain/error/index.js";
import type { IdGenerator } from "../gateway/id-generator.js";
import { RuleBook } from "../../domain/aggregate/rule-book.js";

export class AddRule {
  private readonly ruleRepo: CategoryRuleRepository;
  private readonly idGenerator: IdGenerator;
  private readonly registry: CategoryRegistry;

  constructor(
    ruleRepo: CategoryRuleRepository,
    idGenerator: IdGenerator,
    registry: CategoryRegistry,
  ) {
    this.ruleRepo = ruleRepo;
    this.idGenerator = idGenerator;
    this.registry = registry;
  }

  execute(pattern: string, categoryId: string): { categoryName: string; rule: CategoryRuleDto } {
    if (!pattern.trim()) {
      throw new DomainError("pattern: must not be empty");
    }

    // Validate category ID (throws DomainError if unknown)
    this.registry.assertValid(categoryId);

    // Look up category name for the response
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- assertValid guarantees existence
    const categoryName = DEFAULT_CATEGORIES.find((cat) => cat.id === categoryId)!.name;

    const id = this.idGenerator.fromPattern(pattern);
    const rule = CategoryRule.create(id, pattern, categoryId, "learned", this.registry);

    // Enforce uniqueness via RuleBook aggregate
    const ruleBook = new RuleBook(this.ruleRepo.findAll());
    ruleBook.addRule(rule); // throws DomainError if duplicate

    this.ruleRepo.save(rule);
    return { categoryName, rule: toCategoryRuleDto(rule) };
  }
}
