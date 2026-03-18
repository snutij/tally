import { FR_BANK_PREFIXES, FR_DEFAULT_RULES } from "./fr.js";

export interface DefaultRuleEntry {
  readonly pattern: string;
  readonly categoryId: string;
}

export const DEFAULT_LOCALE = "fr";

const RULES_BY_LOCALE: Record<string, DefaultRuleEntry[]> = {
  fr: FR_DEFAULT_RULES,
};

const PREFIXES_BY_LOCALE: Record<string, string[]> = {
  fr: FR_BANK_PREFIXES,
};

export function getDefaultRulesForLocale(locale: string): DefaultRuleEntry[] {
  return RULES_BY_LOCALE[locale] ?? [];
}

export function getDefaultPrefixesForLocale(locale: string): string[] {
  return PREFIXES_BY_LOCALE[locale] ?? [];
}
