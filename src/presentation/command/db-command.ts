import { existsSync, unlinkSync } from "node:fs";
import { Command } from "commander";
import { dbPath } from "../../infrastructure/persistence/data-dir.js";

export function createDbCommand(): Command {
  const db = new Command("db").description("Database maintenance");

  db.command("reset")
    .description("Delete the local database and start fresh")
    .action(() => {
      if (!existsSync(dbPath)) {
        console.log("No database found — nothing to reset.");
        return;
      }
      unlinkSync(dbPath);
      console.log(`Deleted ${dbPath}`);
    });

  db.command("path")
    .description("Print the database file path")
    .action(() => {
      console.log(dbPath);
    });

  return db;
}
