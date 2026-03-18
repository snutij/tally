import { type CategoryRuleDto, toCategoryRuleDto } from "../dto/category-rule-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { CategoryRule } from "../../domain/entity/category-rule.js";
import { DomainError } from "../../domain/error/index.js";
import type { IdGenerator } from "../port/id-generator.js";
import type { RuleBookRepository } from "../port/rule-book-repository.js";

export class AddRule {
  private readonly ruleBookRepository: RuleBookRepository;
  private readonly idGenerator: IdGenerator;
  private readonly registry: CategoryRegistry;

  constructor(
    ruleBookRepository: RuleBookRepository,
    idGenerator: IdGenerator,
    registry: CategoryRegistry,
  ) {
    this.ruleBookRepository = ruleBookRepository;
    this.idGenerator = idGenerator;
    this.registry = registry;
  }

  execute(pattern: string, categoryId: string): { categoryName: string; rule: CategoryRuleDto } {
    if (!pattern.trim()) {
      throw new DomainError("pattern: must not be empty");
    }

    // Validate category existence (application layer responsibility)
    this.registry.assertValid(categoryId);

    const categoryName = this.registry.nameOf(categoryId) ?? categoryId;

    const id = this.idGenerator.fromPattern(pattern);
    const rule = CategoryRule.create(id, pattern, categoryId, "learned");

    const ruleBook = this.ruleBookRepository.load();
    ruleBook.addRule(rule); // throws DomainError if duplicate
    this.ruleBookRepository.save(ruleBook);

    return { categoryName, rule: toCategoryRuleDto(rule, this.registry) };
  }
}
