import type { CategoryRule } from "../../domain/entity/category-rule.js";

export interface CategoryRuleGateway {
  save(rule: CategoryRule): void;
  findAll(): CategoryRule[];
  findByPattern(pattern: string): CategoryRule | undefined;
  removeByPattern(pattern: string): void;
}
