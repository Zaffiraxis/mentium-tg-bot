import { Telegraf, Context } from 'telegraf';
import { env } from '../env';
import { registerCommands } from './commands';
import { registerCallbacks } from './callbacks';
import { logger } from '../utils/logger';
import { logEvent } from '../services/eventService';

export function createBot(): Telegraf<Context> {
  const bot = new Telegraf<Context>(env.TELEGRAM_BOT_TOKEN);

  registerCommands(bot);
  registerCallbacks(bot);

  // Handle blocked/deactivated users
  bot.catch((err: any, ctx) => {
    const chatId = String(ctx.chat?.id ?? 'unknown');
    if (err?.response?.error_code === 403) {
      logger.warn('Bot blocked by user', { chatId });
      logEvent(chatId, 'bot_blocked').catch(() => {});
    } else {
      logger.error('Bot error', { chatId, error: err.message });
    }
  });

  return bot;
}
