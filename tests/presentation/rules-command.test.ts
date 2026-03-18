import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddRule } from "../../src/application/usecase/add-rule.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { Command } from "commander";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { InMemoryCategoryRuleGateway } from "../helpers/in-memory-repositories.js";
import { ListRules } from "../../src/application/usecase/list-rules.js";
import { RemoveRule } from "../../src/application/usecase/remove-rule.js";
import type { Renderer } from "../../src/presentation/renderer/renderer.js";
import { createRulesCommand } from "../../src/presentation/command/rules-command.js";

function makeTestRule(
  pattern: string,
  categoryId: string,
  source: "default" | "learned",
): CategoryRule {
  return CategoryRule.create(
    `id-${pattern}`.slice(0, 32),
    pattern,
    categoryId,
    source,
    new CategoryRegistry(DEFAULT_CATEGORIES),
  );
}

describe("createRulesCommand", () => {
  let ruleGateway: InMemoryCategoryRuleGateway;
  let listRules: ListRules;
  let addRule: AddRule;
  let removeRule: RemoveRule;
  const mockRenderer: Renderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  function run(...args: string[]): Promise<unknown> {
    const cmd = createRulesCommand(listRules, addRule, removeRule, mockRenderer);
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "rules", ...args]);
  }

  beforeEach(() => {
    ruleGateway = new InMemoryCategoryRuleGateway();
    listRules = new ListRules(ruleGateway, new CategoryRegistry(DEFAULT_CATEGORIES));
    addRule = new AddRule(
      ruleGateway,
      { fromPattern: (pat): string => `id-${pat}`.slice(0, 32) },
      new CategoryRegistry(DEFAULT_CATEGORIES),
    );
    removeRule = new RemoveRule(ruleGateway);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = 0;
  });

  describe("list", () => {
    it("renders all rules via the renderer", async () => {
      ruleGateway.save(makeTestRule(String.raw`\bspotify\b`, "w06", "default"));
      await run("list");
      expect(mockRenderer.render).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ pattern: "\\bspotify\\b" })]),
      );
    });

    it("renders an empty array when no rules exist", async () => {
      await run("list");
      expect(mockRenderer.render).toHaveBeenCalledWith([]);
    });
  });

  describe("add", () => {
    it("saves a new learned rule", async () => {
      await run("add", String.raw`\bmonoprix\b`, "n02");
      const rule = ruleGateway.findByPattern(String.raw`\bmonoprix\b`);
      expect(rule).toBeDefined();
      expect(rule?.source).toBe("learned");
    });

    it("logs confirmation message", async () => {
      await run("add", String.raw`\bmonoprix\b`, "n02");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Rule added"));
    });

    it("rejects an invalid regex", async () => {
      await run("add", "[invalid", "n02");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Invalid regex"));
      expect(process.exitCode).toBe(1);
    });

    it("rejects an unknown category ID", async () => {
      await run("add", String.raw`\bfoo\b`, "nonexistent");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Unknown category"));
      expect(process.exitCode).toBe(1);
    });

    it("rejects a duplicate pattern", async () => {
      ruleGateway.save(makeTestRule(String.raw`\bmonoprix\b`, "n02", "default"));
      await run("add", String.raw`\bmonoprix\b`, "w01");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("already exists"));
      expect(process.exitCode).toBe(1);
    });

    it("rethrows unexpected errors", async () => {
      vi.spyOn(addRule, "execute").mockImplementation(() => {
        throw new TypeError("unexpected");
      });
      await expect(run("add", String.raw`\bfoo\b`, "n02")).rejects.toThrow("unexpected");
    });
  });

  describe("remove", () => {
    it("removes an existing rule", async () => {
      ruleGateway.save(makeTestRule(String.raw`\bspotify\b`, "w06", "default"));
      await run("remove", String.raw`\bspotify\b`);
      expect(ruleGateway.findByPattern(String.raw`\bspotify\b`)).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Rule removed"));
    });

    it("logs a message when pattern not found", async () => {
      await run("remove", String.raw`\bnotfound\b`);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No rule found"));
    });
  });
});
