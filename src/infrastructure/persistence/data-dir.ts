import { join } from "node:path";
import { homedir } from "node:os";

export const dataDir = join(homedir(), ".local", "share", "tally");
export const dbPath = join(dataDir, "tally.db");
