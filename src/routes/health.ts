import { Router, Request, Response } from 'express';
import { db } from '../db/client';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, service: 'mntim-telegram-bot' });
  } catch {
    res.status(503).json({ ok: false, service: 'mntim-telegram-bot', error: 'db_unavailable' });
  }
});
