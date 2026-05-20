import { Pool } from 'pg';
import { env } from '../env';
import { logger } from '../utils/logger';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

db.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

export async function testConnection(): Promise<void> {
  const client = await db.connect();
  client.release();
  logger.info('Database connection established');
}
