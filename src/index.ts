import './env'; // validates env first
import express from 'express';
import { env } from './env';
import { createBot } from './bot/bot';
import { testConnection } from './db/client';
import { testRedisConnection } from './utils/redis';
import { startReminderWorker } from './workers/reminderWorker';
import { healthRouter } from './routes/health';
import { createWebhookRouter } from './routes/webhook';
import { createInternalEventsRouter } from './routes/internalEvents';
import { logger } from './utils/logger';

async function main() {
  logger.info('Bot starting', { nodeEnv: env.NODE_ENV, port: env.PORT });

  await testConnection();       // logs: PostgreSQL connected
  await testRedisConnection();  // logs: Redis connected

  const bot = createBot();
  const app = express();

  app.use(express.json());
  app.use(healthRouter);
  app.use(createInternalEventsRouter(bot));
  app.use(createWebhookRouter(bot));

  startReminderWorker(bot);     // logs: Reminder worker started

  if (env.TELEGRAM_USE_POLLING) {
    logger.info('Starting bot in polling mode');
    await bot.launch();
    logger.info('Bot polling started');
  } else {
    if (!env.PUBLIC_BOT_URL) {
      logger.error('PUBLIC_BOT_URL is required when TELEGRAM_USE_POLLING=false');
      process.exit(1);
    }
    const webhookUrl = `${env.PUBLIC_BOT_URL}/telegram/webhook/${env.TELEGRAM_WEBHOOK_SECRET}`;
    try {
      await bot.telegram.setWebhook(webhookUrl);
      logger.info('Webhook registered', { webhookUrl });
    } catch (err: any) {
      // Non-fatal: HTTP server still starts for health checks and internal endpoints.
      // Re-register manually with: npm run telegram:set-webhook
      logger.error('Webhook registration failed', { webhookUrl, error: err.message });
    }
  }

  app.listen(env.PORT, () => {
    logger.info('HTTP server listening', { port: env.PORT });
    logger.info('Bot startup complete');
  });

  const shutdown = async () => {
    logger.info('Shutting down...');
    await bot.stop('SIGTERM');
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Failed to start bot', { error: err.message, stack: err.stack });
  process.exit(1);
});
