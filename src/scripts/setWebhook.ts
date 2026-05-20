import '../env';
import { env } from '../env';
import { Telegraf } from 'telegraf';

async function setWebhook() {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  const BOT_SERVICE_URL = process.env.PUBLIC_BOT_URL ?? process.env.BOT_SERVICE_URL;
  if (!BOT_SERVICE_URL) {
    console.error('Error: PUBLIC_BOT_URL env var is required to set webhook');
    process.exit(1);
  }
  const url = `${BOT_SERVICE_URL}/telegram/webhook/${env.TELEGRAM_WEBHOOK_SECRET}`;
  await bot.telegram.setWebhook(url);
  console.log('Webhook set:', url);
  const info = await bot.telegram.getWebhookInfo();
  console.log('Webhook info:', JSON.stringify(info, null, 2));
}

setWebhook().catch(console.error);
