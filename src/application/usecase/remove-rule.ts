import { DomainError } from "../../domain/error/index.js";
import type { RuleBookRepository } from "../port/rule-book-repository.js";

export class RemoveRule {
  private readonly ruleBookRepository: RuleBookRepository;

  constructor(ruleBookRepository: RuleBookRepository) {
    this.ruleBookRepository = ruleBookRepository;
  }

  execute(pattern: string): boolean {
    if (!pattern.trim()) {
      throw new DomainError("pattern: must not be empty");
    }
    const ruleBook = this.ruleBookRepository.load();
    if (!ruleBook.findByPattern(pattern)) {
      return false;
    }
    ruleBook.removeByPattern(pattern);
    this.ruleBookRepository.save(ruleBook);
    return true;
  }
}
