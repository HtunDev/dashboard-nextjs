import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { testConnection, initializeDatabase, dbConfigExport } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(root, '.env.local') });

/**
 * Create tables in the existing database.
 * Prerequisite: Create the database yourself first, for example:
 * CREATE DATABASE dashboard_template;
 */
export async function migrateDatabase() {
  console.log('Running database migrate...\n');
  console.log(`Database: ${dbConfigExport.database} @ ${dbConfigExport.host}:${dbConfigExport.port}\n`);

  try {
    const connected = await testConnection();
    if (!connected) return false;

    await initializeDatabase();
    console.log('\nMigrate completed successfully!');
    console.log('Tables: users, user_trusted_devices');
    await pool.end();
    return true;
  } catch (error) {
    const msg = error?.message || error?.code || String(error);
    console.error('Migrate failed:', msg);
    await pool.end().catch(() => {});
    return false;
  }
}

migrateDatabase()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

export default migrateDatabase;
