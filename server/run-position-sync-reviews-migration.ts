import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { sql } from "drizzle-orm";

import { db } from "./db";

async function main() {
  const migrationPath = path.resolve(process.cwd(), "migrations", "0010_add_position_sync_reviews.sql");
  const migrationSql = await readFile(migrationPath, "utf8");
  const statements = migrationSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }

  console.log("Position sync reviews migration applied successfully.");
}

main().catch((error) => {
  console.error("Failed to apply position sync reviews migration:", error);
  process.exitCode = 1;
});
