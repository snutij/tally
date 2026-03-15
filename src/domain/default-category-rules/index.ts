import type { DefaultRuleEntry } from "../entity/category-rule.js";
import { FR_DEFAULT_RULES } from "./fr.js";

export const DEFAULT_LOCALE = "fr";

const RULES_BY_LOCALE: Record<string, DefaultRuleEntry[]> = {
  fr: FR_DEFAULT_RULES,
};

export function getDefaultRulesForLocale(locale: string): DefaultRuleEntry[] {
  return RULES_BY_LOCALE[locale] ?? [];
}
