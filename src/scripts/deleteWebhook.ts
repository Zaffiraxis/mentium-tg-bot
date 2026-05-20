import '../env';
import { env } from '../env';
import { Telegraf } from 'telegraf';

async function deleteWebhook() {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  await bot.telegram.deleteWebhook();
  console.log('Webhook deleted. Bot is now in polling mode.');
}

deleteWebhook().catch(console.error);
