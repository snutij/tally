import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { DomainError } from "../../domain/error/index.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

interface CategoryAssignment {
  categoryId: string;
  id: string;
}

export class SaveCategorizedTransactions {
  private readonly txnRepo: TransactionRepository;
  private readonly registry: CategoryRegistry;

  constructor(txnRepo: TransactionRepository, registry: CategoryRegistry) {
    this.txnRepo = txnRepo;
    this.registry = registry;
  }

  execute(assignments: CategoryAssignment[]): { categorizedCount: number } {
    if (assignments.length === 0) {
      throw new DomainError("assignments: must contain at least one item");
    }

    const ids = assignments.map((assignment) => TransactionId(assignment.id));
    const transactions = this.txnRepo.findByIds(ids);

    const assignmentMap = new Map(
      assignments.map((assignment) => [assignment.id, assignment.categoryId]),
    );
    const categorized = transactions.map((txn) => {
      const catId = assignmentMap.get(txn.id);
      return catId ? txn.categorize(CategoryId(catId), this.registry) : txn;
    });

    this.txnRepo.saveAll(categorized);
    return { categorizedCount: categorized.length };
  }
}
