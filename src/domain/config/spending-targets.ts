export interface SpendingTargets {
  /** Percentage of income to target for Needs (0-100). */
  readonly needs: number;
  /** Percentage of income to target for Wants (0-100). */
  readonly wants: number;
  /** Percentage of income to target for Investments (0-100). */
  readonly invest: number;
}

/** 50/30/20 rule — the default allocation. */
export const DEFAULT_SPENDING_TARGETS: SpendingTargets = {
  invest: 20,
  needs: 50,
  wants: 30,
};
