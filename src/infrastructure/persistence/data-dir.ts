import { homedir } from "node:os";
import { join } from "node:path";

export const dataDir = join(homedir(), ".local", "share", "tally");
export const dbPath = join(dataDir, "tally.db");
