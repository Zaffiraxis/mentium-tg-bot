import { db } from '../db/client';
import { FIXED_LESSON_DURATION_MINUTES } from '../env';
import { logger } from '../utils/logger';
import { logEvent } from './eventService';

export interface ScheduleData {
  studyDays: string[];
  studyTime: string;
  timezone: string;
  reminderOffsetsMinutes: number[];
}

export interface StudyScheduleRecord {
  id: bigint;
  platform_user_id: string;
  telegram_chat_id: string;
  study_days: string[];
  study_time: string;
  lesson_duration_minutes: number;
  reminder_offsets_minutes: number[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function upsertSchedule(
  platformUserId: string,
  telegramChatId: string,
  data: ScheduleData
): Promise<StudyScheduleRecord> {
  // Deactivate existing schedules
  await db.query(
    `UPDATE telegram_study_schedules SET is_active = FALSE, updated_at = NOW()
     WHERE telegram_chat_id = $1`,
    [telegramChatId]
  );

  const res = await db.query<StudyScheduleRecord>(
    `INSERT INTO telegram_study_schedules
       (platform_user_id, telegram_chat_id, study_days, study_time,
        lesson_duration_minutes, reminder_offsets_minutes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING *`,
    [
      platformUserId,
      telegramChatId,
      JSON.stringify(data.studyDays),
      data.studyTime,
      FIXED_LESSON_DURATION_MINUTES,
      JSON.stringify(data.reminderOffsetsMinutes),
    ]
  );

  const schedule = res.rows[0];

  // Update timezone in user settings
  await db.query(
    `UPDATE telegram_user_settings SET timezone = $1, updated_at = NOW()
     WHERE telegram_chat_id = $2`,
    [data.timezone, telegramChatId]
  );

  await logEvent(telegramChatId, 'schedule_completed', platformUserId);

  return schedule;
}

export async function getActiveSchedule(telegramChatId: string): Promise<StudyScheduleRecord | null> {
  const res = await db.query<StudyScheduleRecord>(
    `SELECT * FROM telegram_study_schedules
     WHERE telegram_chat_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC LIMIT 1`,
    [telegramChatId]
  );
  return res.rows[0] ?? null;
}

export async function disableSchedule(telegramChatId: string): Promise<void> {
  await db.query(
    `UPDATE telegram_study_schedules SET is_active = FALSE, updated_at = NOW()
     WHERE telegram_chat_id = $1`,
    [telegramChatId]
  );
}

export async function getUserSettings(telegramChatId: string) {
  const res = await db.query(
    `SELECT * FROM telegram_user_settings WHERE telegram_chat_id = $1`,
    [telegramChatId]
  );
  return res.rows[0] ?? null;
}

export async function ensureUserSettings(
  platformUserId: string,
  telegramChatId: string,
  timezone?: string
): Promise<void> {
  await db.query(
    `INSERT INTO telegram_user_settings (platform_user_id, telegram_chat_id, timezone)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_chat_id) DO UPDATE
     SET platform_user_id = EXCLUDED.platform_user_id,
         timezone = COALESCE(EXCLUDED.timezone, telegram_user_settings.timezone),
         updated_at = NOW()`,
    [platformUserId, telegramChatId, timezone ?? 'Europe/Kiev']
  );
}

export async function disableReminders(telegramChatId: string): Promise<void> {
  await db.query(
    `UPDATE telegram_user_settings SET is_enabled = FALSE, updated_at = NOW()
     WHERE telegram_chat_id = $1`,
    [telegramChatId]
  );
  await disableSchedule(telegramChatId);
}

export async function markUserLinkedFromEvent(
  telegramChatId: string,
  platformUserId: string,
  subscriptionStatus?: string
): Promise<void> {
  await db.query(
    `INSERT INTO telegram_user_settings
       (platform_user_id, telegram_chat_id, is_linked, subscription_status, last_platform_event_at)
     VALUES ($1, $2, TRUE, $3, NOW())
     ON CONFLICT (telegram_chat_id) DO UPDATE
     SET platform_user_id = EXCLUDED.platform_user_id,
         is_linked = TRUE,
         subscription_status = COALESCE(EXCLUDED.subscription_status, telegram_user_settings.subscription_status),
         last_platform_event_at = NOW(),
         updated_at = NOW()`,
    [platformUserId, telegramChatId, subscriptionStatus ?? null]
  );
}

export async function recordPlatformVisitNudge(telegramChatId: string): Promise<void> {
  await db.query(
    `INSERT INTO telegram_user_settings (telegram_chat_id, last_platform_visit_nudge_at)
     VALUES ($1, NOW())
     ON CONFLICT (telegram_chat_id) DO UPDATE
     SET last_platform_visit_nudge_at = NOW(), updated_at = NOW()`,
    [telegramChatId]
  );
}

export async function canSendPlatformVisitNudge(telegramChatId: string): Promise<boolean> {
  const res = await db.query<{ last_platform_visit_nudge_at: Date | null }>(
    `SELECT last_platform_visit_nudge_at FROM telegram_user_settings
     WHERE telegram_chat_id = $1`,
    [telegramChatId]
  );
  const last = res.rows[0]?.last_platform_visit_nudge_at;
  if (!last) return true;
  const diffMs = Date.now() - new Date(last).getTime();
  return diffMs > 24 * 60 * 60 * 1000;
}
