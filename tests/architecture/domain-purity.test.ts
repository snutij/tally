import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Domain files must only throw DomainError (or subclasses), never raw JS error types.
// Throwing Error/TypeError/etc. bypasses the domain's own error model and leaks
// infrastructure-level error types into the domain boundary.

const DOMAIN_DIR = resolve(import.meta.dirname, "../../src/domain");

// Native JS error constructors that must not appear in domain throws
const NATIVE_ERROR_RE = /\bthrow new (Error|TypeError|RangeError|ReferenceError|SyntaxError)\b/g;

function collectDomainFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      for (const nested of collectDomainFiles(fullPath)) {
        results.push(nested);
      }
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("Architecture: domain purity", () => {
  it("domain layer throws only DomainError, never raw JS error types", () => {
    const violations: string[] = [];

    for (const filePath of collectDomainFiles(DOMAIN_DIR)) {
      const relativePath = filePath.replace(/.*\/src\//, "src/");

      // Skip the error module itself — it defines DomainError which extends Error
      if (!relativePath.includes("domain/error/")) {
        const content = readFileSync(filePath, "utf8");
        const matches = content.match(NATIVE_ERROR_RE);
        if (matches) {
          violations.push(`${relativePath}: ${matches.join(", ")}`);
        }
      }
    }

    if (violations.length > 0) {
      const report = violations.map((violation) => `  ${violation}`).join("\n");
      expect.fail(
        `Found ${violations.length} domain file(s) throwing raw JS error types:\n\n${report}\n\nUse DomainError (or a subclass) instead.`,
      );
    }

    expect(violations).toHaveLength(0);
  });
});
