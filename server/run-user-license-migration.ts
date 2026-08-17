import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const sql = await readFile(
    path.resolve(import.meta.dirname, "..", "migrations", "0025_add_user_license_state.sql"),
    "utf8",
  );
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("User license-state migration applied successfully.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    `User license-state migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  process.exitCode = 1;
});
