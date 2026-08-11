import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const migrationPath = path.resolve(
    import.meta.dirname,
    '..',
    'migrations',
    '0016_add_copy_group_health_review_preferences.sql',
  );

  const sql = await readFile(migrationPath, 'utf8');
  const client = new pg.Client({ connectionString });

  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Copy-group health review preferences migration applied successfully.');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors so we can report the original failure.
    }

    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown migration error';
  console.error(`Copy-group health review preferences migration failed: ${message}`);
  process.exitCode = 1;
});
