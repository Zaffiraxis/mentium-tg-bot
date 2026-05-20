import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { FIXED_LESSON_DURATION_MINUTES } from '../env';
import { logger } from '../utils/logger';

const LINK_EXPIRY_MINUTES = 20;

export interface TelegramLinkRecord {
  id: bigint;
  link_token: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  status: 'pending' | 'linked' | 'expired' | 'cancelled';
  platform_user_id: string | null;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function createLinkToken(
  telegramUserId: string,
  telegramChatId: string,
  username?: string,
  firstName?: string,
  lastName?: string
): Promise<string> {
  // Expire any previous pending tokens for this chat
  await db.query(
    `UPDATE telegram_links SET status = 'expired', updated_at = NOW()
     WHERE telegram_chat_id = $1 AND status = 'pending'`,
    [telegramChatId]
  );

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_MINUTES * 60 * 1000);

  await db.query(
    `INSERT INTO telegram_links
       (link_token, telegram_user_id, telegram_chat_id, telegram_username,
        telegram_first_name, telegram_last_name, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
    [token, telegramUserId, telegramChatId, username ?? null, firstName ?? null, lastName ?? null, expiresAt]
  );

  return token;
}

export async function getLinkByToken(token: string): Promise<TelegramLinkRecord | null> {
  const res = await db.query<TelegramLinkRecord>(
    `SELECT * FROM telegram_links WHERE link_token = $1`,
    [token]
  );
  return res.rows[0] ?? null;
}

export async function consumeLinkToken(
  token: string,
  platformUserId: string
): Promise<{ ok: boolean; reason?: string }> {
  const link = await getLinkByToken(token);

  if (!link) return { ok: false, reason: 'not_found' };
  if (link.status === 'linked') return { ok: false, reason: 'already_used' };
  if (link.status !== 'pending') return { ok: false, reason: 'invalid_status' };
  if (new Date() > link.expires_at) {
    await db.query(
      `UPDATE telegram_links SET status = 'expired', updated_at = NOW() WHERE link_token = $1`,
      [token]
    );
    return { ok: false, reason: 'expired' };
  }

  await db.query(
    `UPDATE telegram_links
     SET status = 'linked', platform_user_id = $1, used_at = NOW(), updated_at = NOW()
     WHERE link_token = $2`,
    [platformUserId, token]
  );

  return { ok: true };
}

export async function getLinkedChatId(platformUserId: string): Promise<string | null> {
  const res = await db.query<{ telegram_chat_id: string }>(
    `SELECT telegram_chat_id FROM telegram_links
     WHERE platform_user_id = $1 AND status = 'linked'
     ORDER BY used_at DESC LIMIT 1`,
    [platformUserId]
  );
  return res.rows[0]?.telegram_chat_id ?? null;
}

export async function isAlreadyLinked(telegramChatId: string): Promise<boolean> {
  const linkRes = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM telegram_links
     WHERE telegram_chat_id = $1 AND status = 'linked'`,
    [telegramChatId]
  );
  if (parseInt(linkRes.rows[0]?.count ?? '0') > 0) return true;

  // Also check users linked via backend events (user_registered, paid_lesson_purchased)
  const settingsRes = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM telegram_user_settings
     WHERE telegram_chat_id = $1 AND is_linked = TRUE`,
    [telegramChatId]
  );
  return parseInt(settingsRes.rows[0]?.count ?? '0') > 0;
}

export async function getPlatformUserIdByChatId(telegramChatId: string): Promise<string | null> {
  const linkRes = await db.query<{ platform_user_id: string }>(
    `SELECT platform_user_id FROM telegram_links
     WHERE telegram_chat_id = $1 AND status = 'linked'
     ORDER BY used_at DESC LIMIT 1`,
    [telegramChatId]
  );
  if (linkRes.rows[0]?.platform_user_id) return linkRes.rows[0].platform_user_id;

  // Fallback: user linked via backend event
  const settingsRes = await db.query<{ platform_user_id: string }>(
    `SELECT platform_user_id FROM telegram_user_settings
     WHERE telegram_chat_id = $1 AND platform_user_id IS NOT NULL AND is_linked = TRUE
     LIMIT 1`,
    [telegramChatId]
  );
  return settingsRes.rows[0]?.platform_user_id ?? null;
}
