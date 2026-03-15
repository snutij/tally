import type { CategoryRuleRepository } from "../../application/gateway/category-rule-repository.js";
import { Command } from "commander";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import type { Renderer } from "../renderer/renderer.js";
import { createCategoryRule } from "../../domain/entity/category-rule.js";

export function createRulesCommand(ruleRepo: CategoryRuleRepository, renderer: Renderer): Command {
  const cmd = new Command("rules").description("Manage auto-categorization rules");

  cmd
    .command("list")
    .description("List all category rules")
    .action(() => {
      const rules = ruleRepo.findAll();
      console.log(renderer.render(rules));
    });

  cmd
    .command("add")
    .description("Add a manual categorization rule")
    .argument("<pattern>", "Regex pattern to match transaction labels (case-insensitive)")
    .argument("<category-id>", "Category ID to assign (e.g. n02, w06)")
    .action((pattern: string, categoryId: string) => {
      try {
        // eslint-disable-next-line no-new -- validation only
        new RegExp(pattern, "i");
      } catch {
        console.error(`Invalid regex pattern: "${pattern}"`);
        process.exitCode = 1;
        return;
      }

      const category = DEFAULT_CATEGORIES.find((cat) => cat.id === categoryId);
      if (!category) {
        console.error(`Unknown category ID: "${categoryId}"`);
        process.exitCode = 1;
        return;
      }

      if (ruleRepo.findByPattern(pattern)) {
        console.error(`A rule for pattern "${pattern}" already exists.`);
        process.exitCode = 1;
        return;
      }

      const rule = createCategoryRule(pattern, categoryId, "learned");
      ruleRepo.save(rule);
      console.log(`Rule added: "${pattern}" → ${category.name}`);
    });

  cmd
    .command("remove")
    .description("Remove a categorization rule by pattern")
    .argument("<pattern>", "Exact pattern string to remove")
    .action((pattern: string) => {
      const existing = ruleRepo.findByPattern(pattern);
      if (!existing) {
        console.log(`No rule found for pattern "${pattern}".`);
        return;
      }
      ruleRepo.removeByPattern(pattern);
      console.log(`Rule removed: "${pattern}"`);
    });

  return cmd;
}
