export interface DetectionResult<TValue> {
  value: TValue;
  confident: boolean;
}

const CANDIDATES = [";", ",", "\t"] as const;

export function detectDelimiter(lines: string[]): DetectionResult<string> {
  const sampleLines = lines.slice(0, 5).filter((line) => line.trim().length > 0);
  if (sampleLines.length === 0) {
    return { confident: false, value: "," };
  }

  const consistent = CANDIDATES.filter((delim) => {
    const counts = sampleLines.map((line) => line.split(delim).length);
    return counts.every((count) => count === counts[0]) && (counts[0] ?? 0) > 1;
  });

  if (consistent.length === 1) {
    return { confident: true, value: consistent[0] ?? "," };
  }

  if (consistent.length > 1) {
    // Multiple candidates: pick the one with the highest column count
    const firstLine = sampleLines[0] ?? "";
    let best: string = consistent[0] ?? ",";
    for (const candidate of consistent.slice(1)) {
      if (firstLine.split(candidate).length > firstLine.split(best).length) {
        best = candidate;
      }
    }
    return { confident: false, value: best };
  }

  return { confident: false, value: "," };
}
