import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { sql } from "drizzle-orm";

import { db } from "./db";

async function main() {
  const migrationPath = path.resolve(process.cwd(), "migrations", "0008_add_copy_group_registration_board_json.sql");
  const migrationSql = await readFile(migrationPath, "utf8");
  const statements = migrationSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }

  console.log("Copy-group registration board metadata migration applied successfully.");
}

main().catch((error) => {
  console.error("Failed to apply copy-group registration board metadata migration:", error);
  process.exitCode = 1;
});
