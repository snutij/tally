// Common French bank label prefixes to strip before extracting the merchant name.
// Sorted longest-first so we match the most specific prefix at runtime.
const FRENCH_BANK_PREFIXES = [
  "PAIEMENT CB",
  "ACHAT CB",
  "PRLV SEPA",
  "VIR SEPA",
  "VIR RECU",
  "VIR EMIS",
  "RETRAIT DAB",
  "CARTE CB",
  "PRELEVEMENT",
  "RETRAIT",
  "CHEQUE",
  "FRAIS CB",
  "PRLV",
  "VIR",
].toSorted((prefixA, prefixB) => prefixB.length - prefixA.length);

// Regex patterns for trailing noise to strip
const TRAILING_DATE = /\s+\d{2}\/\d{2}(?:\/\d{2,4})?\s*$/;
const TRAILING_CARD_REF = /\s+CB\s*\*?\s*\d+\s*$/;
const TRAILING_ID = /\s+[A-Z]{0,3}\d{4,}\s*$/;
const TRAILING_PUNCT = /[*\-.,]+$/;

/**
 * Extracts a reusable regex pattern from a raw bank transaction label.
 * Returns `undefined` if no meaningful merchant name can be extracted.
 *
 * @example
 * extractPattern("CARTE CB CARREFOUR CITY PARIS 15/03") → "\\bcarrefour\\s+city\\b"
 * extractPattern("PRLV SEPA FREE MOBILE 123456")        → "\\bfree\\s+mobile\\b"
 * extractPattern("SPOTIFY")                              → "\\bspotify\\b"
 * extractPattern("VIR 15/03/2026 CB*1234")              → undefined
 */
export function extractPattern(rawLabel: string): string | undefined {
  let label = rawLabel.toUpperCase().trim();

  // 1. Strip the first matching bank prefix
  for (const prefix of FRENCH_BANK_PREFIXES) {
    if (label.startsWith(prefix)) {
      label = label.slice(prefix.length).trim();
      break;
    }
  }

  // 2. Strip trailing noise
  label = label.replace(TRAILING_DATE, "").trim();
  label = label.replace(TRAILING_CARD_REF, "").trim();
  label = label.replace(TRAILING_ID, "").trim();
  label = label.replace(TRAILING_PUNCT, "").trim();

  // 3. Collect words: at least 2 chars, contains a letter
  const words = label.split(/\s+/).filter((word) => word.length >= 2 && /[A-Z]/.test(word));

  if (words.length === 0) {
    return undefined;
  }

  // 4. Take first 2 significant words and build a case-insensitive word-bounded pattern
  const patternWords = words.slice(0, 2).map((word) => word.toLowerCase());
  const inner = patternWords.length === 1 ? patternWords[0] : patternWords.join(String.raw`\s+`);
  return `\\b${inner}\\b`;
}
