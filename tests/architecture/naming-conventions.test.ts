import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Scan source directories for "Gateway" naming violations.
// Repository = persistence abstraction for aggregates (application/port/)
// Gateway = external system adapters — these MUST NOT appear in port or persistence layers.

const PORT_DIR = resolve(import.meta.dirname, "../../src/application/port");
const PERSISTENCE_DIR = resolve(import.meta.dirname, "../../src/infrastructure/persistence");

function tsFilesIn(dir: string): string[] {
  return readdirSync(dir).filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"));
}

describe("Architecture: naming conventions", () => {
  describe("application/port file names", () => {
    it("no port file is named with 'gateway'", () => {
      const violations = tsFilesIn(PORT_DIR).filter((file) =>
        file.toLowerCase().includes("gateway"),
      );
      expect(violations).toEqual([]);
    });
  });

  describe("application/port interface names", () => {
    it("no exported interface, type, or class in port layer uses 'Gateway' naming", () => {
      const violations: string[] = [];
      for (const file of tsFilesIn(PORT_DIR)) {
        const content = readFileSync(resolve(PORT_DIR, file), "utf8");
        const matches = content.match(/\bexport\s+(?:interface|type|class)\s+\w*Gateway\w*/g);
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
});
