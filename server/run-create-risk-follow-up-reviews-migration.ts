import fs from "node:fs/promises";
import path from "node:path";

import { db } from "./db";

async function run() {
  const migrationPath = path.resolve(
    process.cwd(),
    "migrations",
    "0018_create_risk_follow_up_reviews.sql",
  );
  const sql = await fs.readFile(migrationPath, "utf8");
  await db.execute(sql);
  console.log("Risk follow-up reviews table migration applied successfully.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Risk follow-up reviews table migration failed: ${message}`);
  process.exitCode = 1;
});
