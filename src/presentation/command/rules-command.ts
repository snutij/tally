import type { AddRule } from "../../application/usecase/add-rule.js";
import { Command } from "commander";
import { DomainError } from "../../application/error.js";
import type { ListRules } from "../../application/usecase/list-rules.js";
import type { RemoveRule } from "../../application/usecase/remove-rule.js";
import type { Renderer } from "../renderer/renderer.js";

export function createRulesCommand(
  listRules: ListRules,
  addRule: AddRule,
  removeRule: RemoveRule,
  renderer: Renderer,
): Command {
  const cmd = new Command("rules").description("Manage auto-categorization rules");

  cmd
    .command("list")
    .description("List all category rules")
    .action(() => {
      const rules = listRules.execute();
      console.log(renderer.render(rules));
    });

  cmd
    .command("add")
    .description("Add a manual categorization rule")
    .argument("<pattern>", "Regex pattern to match transaction labels (case-insensitive)")
    .argument("<category-id>", "Category ID to assign (e.g. n02, w06)")
    .action((pattern: string, categoryId: string) => {
      try {
        const { categoryName } = addRule.execute(pattern, categoryId);
        console.log(`Rule added: "${pattern}" → ${categoryName}`);
      } catch (error) {
        if (error instanceof DomainError) {
          console.error(error.message);
          process.exitCode = 1;
        } else {
          throw error;
        }
      }
    });

  cmd
    .command("remove")
    .description("Remove a categorization rule by pattern")
    .argument("<pattern>", "Exact pattern string to remove")
    .action((pattern: string) => {
      const removed = removeRule.execute(pattern);
      if (removed) {
        console.log(`Rule removed: "${pattern}"`);
      } else {
        console.log(`No rule found for pattern "${pattern}".`);
      }
    });

  return cmd;
}
