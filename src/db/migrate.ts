import fs from 'fs';
import path from 'path';
import { db } from './client';
import { logger } from '../utils/logger';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    logger.info(`Running migration: ${file}`);
    await db.query(sql);
    logger.info(`Migration complete: ${file}`);
  }

  await db.end();
  logger.info('All migrations complete');
}

migrate().catch(err => {
  logger.error('Migration failed', { error: err.message });
  process.exit(1);
});
