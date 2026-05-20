import { db } from '../db/client';
import { logger } from '../utils/logger';

export type EventType =
  | 'bot_started'
  | 'discover_clicked'
  | 'mntim_opened_clicked'
  | 'link_created'
  | 'account_linked'
  | 'platform_visited_event_received'
  | 'user_registered_event_received'
  | 'paid_lesson_purchased_event_received'
  | 'schedule_started'
  | 'schedule_saved'
  | 'schedule_completed'
  | 'schedule_changed'
  | 'reminder_scheduled'
  | 'reminder_sent'
  | 'reminder_failed'
  | 'reminder_clicked'
  | 'lesson_link_clicked'
  | 'inactivity_nudge_sent'
  | 'bot_blocked'
  | 'interrupted_lesson_followup_sent'
  | 'invalid_duration_attempt';

export async function logEvent(
  telegramChatId: string,
  eventType: EventType,
  platformUserId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO telegram_events (telegram_chat_id, event_type, platform_user_id, metadata)
       VALUES ($1, $2, $3, $4)`,
      [telegramChatId, eventType, platformUserId ?? null, JSON.stringify(metadata ?? {})]
    );
  } catch (err: any) {
    logger.error('Failed to log event', { eventType, telegramChatId, error: err.message });
  }
}
