export interface Specification<TCandidate> {
  isSatisfiedBy(candidate: TCandidate): boolean;
  and(other: Specification<TCandidate>): Specification<TCandidate>;
  or(other: Specification<TCandidate>): Specification<TCandidate>;
  not(): Specification<TCandidate>;
}
