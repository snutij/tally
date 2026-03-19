import { DEFAULT_SPENDING_TARGETS, type SpendingTargets } from "../../application/config.js";

interface SpendingTargetOpts {
  invest?: number;
  needs?: number;
  wants?: number;
}

/**
 * Parses --needs/--wants/--invest CLI flags into SpendingTargets.
 * Returns DEFAULT_SPENDING_TARGETS when no flags are provided.
 * Returns undefined and sets process.exitCode on validation failure.
 */
export function resolveSpendingTargets(opts: SpendingTargetOpts): SpendingTargets | undefined {
  const hasAny = opts.needs !== undefined || opts.wants !== undefined || opts.invest !== undefined;
  if (!hasAny) {
    return DEFAULT_SPENDING_TARGETS;
  }

  const { needs, wants, invest } = opts;
  if (needs === undefined || wants === undefined || invest === undefined) {
    console.error("All three flags (--needs, --wants, --invest) must be provided together.");
    process.exitCode = 1;
    return;
  }

  const sum = needs + wants + invest;
  if (sum !== 100) {
    console.error(`Percentages must sum to 100 (got ${sum}).`);
    process.exitCode = 1;
    return;
  }

  return { invest, needs, wants };
}
