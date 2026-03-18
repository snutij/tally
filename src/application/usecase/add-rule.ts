import { type CategoryRuleDto, toCategoryRuleDto } from "../dto/category-rule-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { CategoryRule } from "../../domain/entity/category-rule.js";
import type { CategoryRuleGateway } from "../gateway/category-rule-gateway.js";
import { DomainError } from "../../domain/error/index.js";
import type { IdGenerator } from "../gateway/id-generator.js";
import { RuleBook } from "../../domain/aggregate/rule-book.js";

export class AddRule {
  private readonly ruleGateway: CategoryRuleGateway;
  private readonly idGenerator: IdGenerator;
  private readonly registry: CategoryRegistry;

  constructor(
    ruleGateway: CategoryRuleGateway,
    idGenerator: IdGenerator,
    registry: CategoryRegistry,
  ) {
    this.ruleGateway = ruleGateway;
    this.idGenerator = idGenerator;
    this.registry = registry;
  }

  execute(pattern: string, categoryId: string): { categoryName: string; rule: CategoryRuleDto } {
    if (!pattern.trim()) {
      throw new DomainError("pattern: must not be empty");
    }

    // Validate category ID (throws DomainError if unknown)
    this.registry.assertValid(categoryId);

    const categoryName = this.registry.nameOf(categoryId) ?? categoryId;

    const id = this.idGenerator.fromPattern(pattern);
    const rule = CategoryRule.create(id, pattern, categoryId, "learned", this.registry);

    // Enforce uniqueness via RuleBook aggregate
    const ruleBook = new RuleBook(this.ruleGateway.findAll());
    ruleBook.addRule(rule); // throws DomainError if duplicate

    this.ruleGateway.save(rule);
    return { categoryName, rule: toCategoryRuleDto(rule, this.registry) };
  }
}
