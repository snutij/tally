import type { DetectionResult } from "./detect-delimiter.js";

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLASH_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const DASH_PATTERN = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

export function detectDateFormat(samples: string[]): DetectionResult<string> {
  const nonEmpty = samples.map((sample) => sample.trim()).filter((sample) => sample.length > 0);

  if (nonEmpty.length === 0) {
    return { confident: false, value: "DD/MM/YYYY" };
  }

  // YYYY-MM-DD is unambiguous
  if (nonEmpty.some((sample) => ISO_PATTERN.test(sample))) {
    return { confident: true, value: "YYYY-MM-DD" };
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const slashSamples = nonEmpty.filter((sample) => SLASH_PATTERN.test(sample));
  if (slashSamples.length > 0) {
    for (const sample of slashSamples) {
      const match = SLASH_PATTERN.exec(sample);
      if (match) {
        const first = Number.parseInt(match[1], 10);
        const second = Number.parseInt(match[2], 10);
        if (first > 12) {
          return { confident: true, value: "DD/MM/YYYY" };
        }
        if (second > 12) {
          return { confident: true, value: "MM/DD/YYYY" };
        }
      }
    }
    return { confident: false, value: "DD/MM/YYYY" };
  }

  // DD-MM-YYYY
  const dashSamples = nonEmpty.filter((sample) => DASH_PATTERN.test(sample));
  if (dashSamples.length > 0) {
    const hasUnambiguous = dashSamples.some((sample) => {
      const match = DASH_PATTERN.exec(sample);
      return match ? Number.parseInt(match[1], 10) > 12 : false;
    });
    return { confident: hasUnambiguous, value: "DD-MM-YYYY" };
  }

  return { confident: false, value: "DD/MM/YYYY" };
}
