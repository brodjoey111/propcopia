import fs from "node:fs/promises";
import path from "node:path";

import { db } from "./db";

async function run() {
  const migrationPath = path.resolve(
    process.cwd(),
    "migrations",
    "0017_add_risk_follow_up_reviews_json.sql",
  );
  const sql = await fs.readFile(migrationPath, "utf8");
  await db.execute(sql);
  console.log("Risk follow-up reviews migration applied successfully.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Risk follow-up reviews migration failed: ${message}`);
  process.exitCode = 1;
});
