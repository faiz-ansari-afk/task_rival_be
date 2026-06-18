import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export default async function globalSetup() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://taskapp:taskapp_dev_pw@localhost:5432/taskmanager_test?schema=public';

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    // Reset schema for a clean, deterministic test run
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query(sql);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
