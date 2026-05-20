import '../env'; // validates env first
import { Telegraf } from 'telegraf';
import { env } from '../env';
import { testConnection } from '../db/client';
import { startReminderWorker } from './reminderWorker';
import { logger } from '../utils/logger';

async function main() {
  await testConnection();

  // Minimal bot instance — only used for bot.telegram.sendMessage inside the worker
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  startReminderWorker(bot);
  logger.info('Reminder worker process started (standalone)');

  const shutdown = async () => {
    logger.info('Worker shutting down...');
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Worker failed to start', { error: err.message, stack: err.stack });
  process.exit(1);
});
