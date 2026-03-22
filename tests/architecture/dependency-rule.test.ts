import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Which source layers are allowed to import from which other layers
const ALLOWED_IMPORTS: Record<string, string[]> = {
  application: ["application", "domain"],
  domain: ["domain"],
  infrastructure: ["application", "domain", "infrastructure"],
  presentation: ["application", "presentation"],
};

// Files exempt from dependency checks (composition root wires everything by design)
const EXEMPT_FILES = new Set(["src/presentation/index.ts"]);

type Layer = keyof typeof ALLOWED_IMPORTS;

function detectLayer(filePath: string): Layer | undefined {
  const normalized = filePath.replaceAll("\\", "/");
  for (const layer of Object.keys(ALLOWED_IMPORTS) as Layer[]) {
    if (normalized.includes(`/src/${layer}/`)) {
      return layer;
    }
  }
  return undefined;
}

function extractImportPaths(content: string): string[] {
  const importRe = /(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g;
  const paths: string[] = [];
  let match: RegExpExecArray | undefined = importRe.exec(content) ?? undefined;
  while (match !== undefined) {
    paths.push(match[1] ?? "");
    match = importRe.exec(content) ?? undefined;
  }
  return paths;
}

function isBareModuleImport(importPath: string): boolean {
  return !importPath.startsWith(".");
}

function getImportedLayer(importPath: string): Layer | undefined {
  for (const layer of Object.keys(ALLOWED_IMPORTS) as Layer[]) {
    if (
      importPath.includes(`/${layer}/`) ||
      importPath.startsWith(`../${layer}/`) ||
      importPath.startsWith(`./${layer}/`)
    ) {
      return layer;
    }
  }
  return undefined;
}

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      for (const nested of collectSourceFiles(fullPath)) {
        results.push(nested);
      }
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      results.push(fullPath.replaceAll("\\", "/"));
    }
  }
  return results;
}

interface Violation {
  file: string;
  importPath: string;
  reason: string;
}

function checkImportViolations(
  importPaths: string[],
  fileLayer: Layer,
  relativePath: string,
): Violation[] {
  const allowed = ALLOWED_IMPORTS[fileLayer] ?? [];
  const violations: Violation[] = [];
  for (const importPath of importPaths) {
    if (isBareModuleImport(importPath)) {
      if (fileLayer === "domain") {
        violations.push({
          file: relativePath,
          importPath,
          reason: `domain layer must not import bare modules (node:* or npm packages)`,
        });
      }
    } else {
      const importedLayer = getImportedLayer(importPath);
      if (importedLayer && !allowed.includes(importedLayer)) {
        violations.push({
          file: relativePath,
          importPath,
          reason: `${fileLayer} must not import from ${importedLayer}`,
        });
      }
    }
  }
  return violations;
}

describe("Architecture boundary: dependency rule", () => {
  it("has no dependency rule violations", () => {
    const sourceFiles = collectSourceFiles(resolve(import.meta.dirname, "../../src"));
    const violations: Violation[] = [];

    for (const filePath of sourceFiles) {
      const relativePath = filePath.replace(/.*\/src\//, "src/");

      if (!EXEMPT_FILES.has(relativePath)) {
        const fileLayer = detectLayer(filePath);
        if (fileLayer) {
          const content = readFileSync(filePath, "utf8");
          const importPaths = extractImportPaths(content);
          violations.push(...checkImportViolations(importPaths, fileLayer, relativePath));
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map(
          (violation) =>
            `  [${violation.reason}]\n  ${violation.file}\n  → ${violation.importPath}`,
        )
        .join("\n\n");
      expect.fail(`Found ${violations.length} dependency rule violation(s):\n\n${report}`);
    }

    expect(violations).toHaveLength(0);
  });
});
