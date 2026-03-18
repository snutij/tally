import type { IdGenerator } from "../../application/port/id-generator.js";
import { createHash } from "node:crypto";

export class Sha256IdGenerator implements IdGenerator {
  // eslint-disable-next-line class-methods-use-this -- implements IdGenerator interface
  fromPattern(pattern: string): string {
    return createHash("sha256").update(pattern).digest("hex").slice(0, 32);
  }
}
