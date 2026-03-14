import type { DetectionResult } from "./detect-delimiter.js";

export function detectDecimalSeparator(samples: string[]): DetectionResult<"," | "."> {
  const nonEmpty = samples
    .map((sample) => sample.trim().replaceAll(/[€$£\s+]/g, ""))
    .filter((sample) => sample.length > 0);

  for (const sample of nonEmpty) {
    const lastComma = sample.lastIndexOf(",");
    const lastDot = sample.lastIndexOf(".");

    if (lastComma > lastDot) {
      return { confident: true, value: "," };
    }
    if (lastDot > lastComma) {
      return { confident: true, value: "." };
    }
  }

  // Integer-only amounts — default to dot, no prompt needed
  return { confident: true, value: "." };
}
