import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { sql } from "drizzle-orm";

import { db } from "./db";

async function main(): Promise<void> {
  const migrationPath = path.resolve(process.cwd(), "migrations", "0024_create_trade_history_records.sql");
  const migrationSql = await readFile(migrationPath, "utf8");
  const statements = migrationSql.split(";").map((statement) => statement.trim()).filter(Boolean);

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }

  console.log("Trade history migration applied successfully.");
}

main().catch((error) => {
  console.error("Failed to apply trade history migration:", error);
  process.exitCode = 1;
});
