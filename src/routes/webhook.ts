import { Router, Request, Response, raw } from 'express';
import { Telegraf, Context } from 'telegraf';
import { env } from '../env';
import { logger } from '../utils/logger';

export function createWebhookRouter(bot: Telegraf<Context>): Router {
  const router = Router();

  // Telegram webhook
  router.post(
    `/telegram/webhook/${env.TELEGRAM_WEBHOOK_SECRET}`,
    raw({ type: 'application/json' }),
    (req: Request, res: Response) => {
      bot.handleUpdate(JSON.parse(req.body.toString()), res).catch((err) => {
        logger.error('Webhook error', { error: err.message });
        res.sendStatus(500);
      });
    }
  );


  return router;
}
