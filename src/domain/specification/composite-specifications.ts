import type { Specification } from "./specification.js";

export function andSpec<TCandidate>(
  left: Specification<TCandidate>,
  right: Specification<TCandidate>,
): Specification<TCandidate> {
  const self: Specification<TCandidate> = {
    and(other: Specification<TCandidate>): Specification<TCandidate> {
      return andSpec(self, other);
    },
    isSatisfiedBy(candidate: TCandidate): boolean {
      return left.isSatisfiedBy(candidate) && right.isSatisfiedBy(candidate);
    },
    not(): Specification<TCandidate> {
      // eslint-disable-next-line no-use-before-define -- hoisted function declarations
      return notSpec(self);
    },
    or(other: Specification<TCandidate>): Specification<TCandidate> {
      // eslint-disable-next-line no-use-before-define -- hoisted function declarations
      return orSpec(self, other);
    },
  };
  return self;
}

export function notSpec<TCandidate>(inner: Specification<TCandidate>): Specification<TCandidate> {
  const self: Specification<TCandidate> = {
    and(other: Specification<TCandidate>): Specification<TCandidate> {
      return andSpec(self, other);
    },
    isSatisfiedBy(candidate: TCandidate): boolean {
      return !inner.isSatisfiedBy(candidate);
    },
    not(): Specification<TCandidate> {
      return notSpec(self);
    },
    or(other: Specification<TCandidate>): Specification<TCandidate> {
      // eslint-disable-next-line no-use-before-define -- hoisted function declarations
      return orSpec(self, other);
    },
  };
  return self;
}

export function orSpec<TCandidate>(
  left: Specification<TCandidate>,
  right: Specification<TCandidate>,
): Specification<TCandidate> {
  const self: Specification<TCandidate> = {
    and(other: Specification<TCandidate>): Specification<TCandidate> {
      return andSpec(self, other);
    },
    isSatisfiedBy(candidate: TCandidate): boolean {
      return left.isSatisfiedBy(candidate) || right.isSatisfiedBy(candidate);
    },
    not(): Specification<TCandidate> {
      return notSpec(self);
    },
    or(other: Specification<TCandidate>): Specification<TCandidate> {
      return orSpec(self, other);
    },
  };
  return self;
}
