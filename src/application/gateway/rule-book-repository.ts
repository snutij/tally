import type { RuleBook } from "../../domain/aggregate/rule-book.js";

export interface RuleBookRepository {
  load(): RuleBook;
  save(ruleBook: RuleBook): void;
}
