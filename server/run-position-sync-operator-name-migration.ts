import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { db } from "./db";

async function run(): Promise<void> {
  const migrationPath = path.resolve(
    process.cwd(),
    "migrations",
    "0013_add_position_sync_operator_name.sql",
  );
  const sql = await fs.readFile(migrationPath, "utf8");

  await db.execute(sql);
  console.log("Position sync operator-name migration applied successfully.");
}

run().catch((error) => {
  console.error("Failed to apply position sync operator-name migration:", error);
  process.exitCode = 1;
});
