import { DomainError } from "../error/index.js";

export class SpendingTargets {
  readonly needs: number;
  readonly wants: number;
  readonly invest: number;

  private constructor(needs: number, wants: number, invest: number) {
    this.needs = needs;
    this.wants = wants;
    this.invest = invest;
  }

  static create(params: { needs: number; wants: number; invest: number }): SpendingTargets {
    const { needs, wants, invest } = params;
    for (const [name, value] of [
      ["needs", needs],
      ["wants", wants],
      ["invest", invest],
    ] as [string, number][]) {
      if (value < 0 || value > 100) {
        throw new DomainError(`SpendingTargets: ${name} must be between 0 and 100, got ${value}`);
      }
    }
    if (needs + wants + invest !== 100) {
      throw new DomainError(
        `SpendingTargets: needs + wants + invest must equal 100, got ${needs + wants + invest}`,
      );
    }
    return new SpendingTargets(needs, wants, invest);
  }
}

/** 50/30/20 rule — the default allocation. */
export const DEFAULT_SPENDING_TARGETS: SpendingTargets = SpendingTargets.create({
  invest: 20,
  needs: 50,
  wants: 30,
});
