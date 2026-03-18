import { type CategoryRuleDto, toCategoryRuleDto } from "../dto/category-rule-dto.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import type { CategoryRuleGateway } from "../gateway/category-rule-gateway.js";

export class ListRules {
  private readonly ruleGateway: CategoryRuleGateway;
  private readonly registry: CategoryRegistry;

  constructor(ruleGateway: CategoryRuleGateway, registry: CategoryRegistry) {
    this.ruleGateway = ruleGateway;
    this.registry = registry;
  }

  execute(): CategoryRuleDto[] {
    return this.ruleGateway.findAll().map((rule) => toCategoryRuleDto(rule, this.registry));
  }
}
