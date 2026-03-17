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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- regex group always present
    paths.push(match[1]!);
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

describe("Architecture boundary: dependency rule", () => {
  it("has no dependency rule violations", () => {
    const sourceFiles = collectSourceFiles(resolve(import.meta.dirname, "../../src"));
    const violations: Violation[] = [];

    for (const filePath of sourceFiles) {
      const relativePath = filePath.replace(/.*\/src\//, "src/");

      if (EXEMPT_FILES.has(relativePath)) {
        // eslint-disable-next-line no-continue -- intentional skip of exempt files
        continue;
      }

      const fileLayer = detectLayer(filePath);
      if (!fileLayer) {
        // eslint-disable-next-line no-continue -- skip files not in a recognized layer
        continue;
      }

      const content = readFileSync(filePath, "utf8");
      const importPaths = extractImportPaths(content);
      const allowed = ALLOWED_IMPORTS[fileLayer] ?? [];

      for (const importPath of importPaths) {
        if (isBareModuleImport(importPath)) {
          // Domain files must have zero bare module imports (node:*, npm packages)
          if (fileLayer === "domain") {
            violations.push({
              file: relativePath,
              importPath,
              reason: `domain layer must not import bare modules (node:* or npm packages)`,
            });
          }
          // Non-domain layers may import node:* and npm packages freely
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
