import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { DomainError } from "../../domain/error/index.js";
import type { DomainEventPublisher } from "../gateway/domain-event-publisher.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

interface CategoryAssignment {
  categoryId: string;
  id: string;
}

export class SaveCategorizedTransactions {
  private readonly txnRepository: TransactionRepository;
  private readonly registry: CategoryRegistry;
  private readonly eventPublisher: DomainEventPublisher;

  constructor(
    txnRepository: TransactionRepository,
    registry: CategoryRegistry,
    eventPublisher: DomainEventPublisher,
  ) {
    this.txnRepository = txnRepository;
    this.registry = registry;
    this.eventPublisher = eventPublisher;
  }

  execute(assignments: CategoryAssignment[]): { categorizedCount: number } {
    if (assignments.length === 0) {
      throw new DomainError("assignments: must contain at least one item");
    }

    const ids = assignments.map((assignment) => TransactionId(assignment.id));
    const transactions = this.txnRepository.findByIds(ids);

    const assignmentMap = new Map(
      assignments.map((assignment) => [assignment.id, assignment.categoryId]),
    );
    const categorized = transactions.map((txn) => {
      const catId = assignmentMap.get(txn.id);
      if (!catId) {
        return txn;
      }
      // Validate category existence (application layer responsibility)
      this.registry.assertValid(catId);
      return txn.categorize(CategoryId(catId));
    });

    this.txnRepository.saveAll(categorized);
    for (const txn of categorized) {
      for (const event of txn.pullDomainEvents()) {
        this.eventPublisher.publish(event);
      }
    }
    return { categorizedCount: categorized.length };
  }
}
