import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Scan source directories for naming violations.
// Repository = persistence abstraction for aggregates (application/gateway/)
// Gateway interfaces MUST NOT appear in the persistence layer.

const GATEWAY_DIR = resolve(import.meta.dirname, "../../src/application/gateway");
const PERSISTENCE_DIR = resolve(import.meta.dirname, "../../src/infrastructure/persistence");
const USECASE_DIR = resolve(import.meta.dirname, "../../src/application/usecase");

function tsFilesIn(dir: string): string[] {
  return readdirSync(dir).filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"));
}

describe("Architecture: naming conventions", () => {
  describe("application/gateway file names", () => {
    it("no gateway file is named with 'port'", () => {
      const violations = tsFilesIn(GATEWAY_DIR).filter((file) =>
        file.toLowerCase().includes("port"),
      );
      expect(violations).toEqual([]);
    });
  });

  describe("application/gateway interface names", () => {
    it("no exported interface, type, or class in gateway layer uses 'Port' naming", () => {
      const violations: string[] = [];
      for (const file of tsFilesIn(GATEWAY_DIR)) {
        const content = readFileSync(resolve(GATEWAY_DIR, file), "utf8");
        const matches = content.match(/\bexport\s+(?:interface|type|class)\s+\w*Port\w*/g);
        if (matches) {
          violations.push(`${file}: ${matches.join(", ")}`);
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe("infrastructure/persistence file names", () => {
    it("no persistence file is named with 'gateway'", () => {
      const violations = tsFilesIn(PERSISTENCE_DIR).filter((file) =>
        file.toLowerCase().includes("gateway"),
      );
      expect(violations).toEqual([]);
    });
  });

  describe("infrastructure/persistence class names", () => {
    it("no class in persistence layer uses 'Gateway' naming", () => {
      const violations: string[] = [];
      for (const file of tsFilesIn(PERSISTENCE_DIR)) {
        const content = readFileSync(resolve(PERSISTENCE_DIR, file), "utf8");
        const matches = content.match(/\bclass\s+\w*Gateway\w*/g);
        if (matches) {
          violations.push(`${file}: ${matches.join(", ")}`);
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe("application/gateway structural contracts", () => {
    it("gateway layer exports only interfaces and types — no class implementations", () => {
      const violations: string[] = [];
      for (const file of tsFilesIn(GATEWAY_DIR)) {
        const content = readFileSync(resolve(GATEWAY_DIR, file), "utf8");
        const matches = content.match(/\bexport\s+(?:abstract\s+)?class\s+\w+/g);
        if (matches) {
          violations.push(`${file}: ${matches.join(", ")}`);
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe("application/usecase coupling", () => {
    it("use cases do not import each other directly", () => {
      const violations: string[] = [];
      for (const file of tsFilesIn(USECASE_DIR)) {
        const content = readFileSync(resolve(USECASE_DIR, file), "utf8");
        const importRe = /from\s+['"](\.[^'"]+)['"]/g;
        let match: RegExpExecArray | undefined = importRe.exec(content) ?? undefined;
        while (match !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- regex group always present
          const importPath = match[1]!;
          // A same-directory relative import (./foo) is a direct use-case → use-case import
          if (importPath.startsWith("./")) {
            violations.push(`${file}: imports ${importPath}`);
          }
          match = importRe.exec(content) ?? undefined;
        }
      }
      expect(violations).toEqual([]);
    });
  });
});
