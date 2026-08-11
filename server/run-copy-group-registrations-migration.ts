import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { sql } from "drizzle-orm";

import { db } from "./db";

async function main() {
  const migrationPath = path.resolve(process.cwd(), "migrations", "0007_add_copy_group_registrations.sql");
  const migrationSql = await readFile(migrationPath, "utf8");
  const statements = migrationSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }

  console.log("Copy-group registrations migration applied successfully.");
}

main().catch((error) => {
  console.error("Failed to apply copy-group registrations migration:", error);
  process.exitCode = 1;
});
