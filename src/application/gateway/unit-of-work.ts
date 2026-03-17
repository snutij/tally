export interface UnitOfWork {
  runInTransaction(fn: () => void): void;
}
