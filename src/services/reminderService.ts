import { Queue, Worker, Job } from 'bullmq';
import { DateTime } from 'luxon';
import { db } from '../db/client';
import { env, FIXED_LESSON_DURATION_MINUTES } from '../env';
import { logger } from '../utils/logger';
import { logEvent } from './eventService';
import { getReminderTime, getNextOccurrence } from '../utils/time';
import { getRedisConnection } from '../utils/redis';

export function getMvpReminderOffsets(): number[] {
  return [env.DAY_OF_LESSON_OFFSET_MINUTES, 60];
}

const connection = getRedisConnection();

export const reminderQueue = new Queue('reminders', { connection });

export type ReminderType =
  | 'day_before'
  | 'day_of_lesson'
  | 'hour_before'
  | 'fifteen_min_before'
  | 'lesson_start'
  | 'inactivity'
  | 'streak'
  | 'interrupted_lesson';

const OFFSET_MAP: Record<ReminderType, number> = {
  day_before: 1440,
  day_of_lesson: 180,
  hour_before: 60,
  fifteen_min_before: 15,
  lesson_start: 0,
  inactivity: 0,
  streak: 0,
  interrupted_lesson: 0,
};

export async function scheduleRemindersForNextLesson(
  platformUserId: string,
  telegramChatId: string,
  scheduleId: bigint,
  studyDays: string[],
  studyTime: string,
  timezone: string,
  reminderOffsets: number[]
): Promise<void> {
  const nextLesson = getNextOccurrence(studyDays, studyTime, timezone);
  if (!nextLesson) {
    logger.warn('No next lesson found', { telegramChatId });
    return;
  }

  // Cancel existing pending reminders for this schedule
  await db.query(
    `UPDATE telegram_reminder_jobs SET status = 'cancelled', updated_at = NOW()
     WHERE schedule_id = $1 AND status = 'pending'`,
    [scheduleId]
  );

  for (const offsetMinutes of reminderOffsets) {
    const fireAt = getReminderTime(nextLesson, offsetMinutes);
    if (fireAt < DateTime.utc()) continue;

    const reminderType = offsetToType(offsetMinutes);
    const delay = fireAt.toMillis() - Date.now();

    const { rows } = await db.query(
      `INSERT INTO telegram_reminder_jobs
         (platform_user_id, telegram_chat_id, schedule_id, reminder_type, scheduled_for, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id`,
      [platformUserId, telegramChatId, scheduleId, reminderType, fireAt.toISO()]
    );

    await reminderQueue.add(
      'send-reminder',
      {
        jobId: rows[0].id.toString(),
        telegramChatId,
        platformUserId,
        reminderType,
        lessonStartUtc: nextLesson.toISO(),
      },
      { delay: Math.max(0, delay), attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );
  }

  // Also schedule lesson_start (offset 0)
  if (!reminderOffsets.includes(0)) {
    const fireAt = nextLesson;
    if (fireAt > DateTime.utc()) {
      const delay = fireAt.toMillis() - Date.now();
      const { rows } = await db.query(
        `INSERT INTO telegram_reminder_jobs
           (platform_user_id, telegram_chat_id, schedule_id, reminder_type, scheduled_for, status)
         VALUES ($1, $2, $3, 'lesson_start', $4, 'pending')
         RETURNING id`,
        [platformUserId, telegramChatId, scheduleId, fireAt.toISO()]
      );
      await reminderQueue.add(
        'send-reminder',
        {
          jobId: rows[0].id.toString(),
          telegramChatId,
          platformUserId,
          reminderType: 'lesson_start',
          lessonStartUtc: nextLesson.toISO(),
        },
        { delay: Math.max(0, delay), attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
    }
  }
}

export async function scheduleInactivityCheck(
  platformUserId: string,
  telegramChatId: string,
  daysInactive: number = 3
): Promise<void> {
  const fireAt = DateTime.utc().plus({ days: daysInactive });
  const delay = fireAt.toMillis() - Date.now();

  await db.query(
    `INSERT INTO telegram_reminder_jobs
       (platform_user_id, telegram_chat_id, reminder_type, scheduled_for, status)
     VALUES ($1, $2, 'inactivity', $3, 'pending')`,
    [platformUserId, telegramChatId, fireAt.toISO()]
  );

  await reminderQueue.add(
    'send-reminder',
    { telegramChatId, platformUserId, reminderType: 'inactivity' },
    { delay, attempts: 2, backoff: { type: 'fixed', delay: 10000 } }
  );
}

export async function markReminderSent(jobId: string): Promise<void> {
  await db.query(
    `UPDATE telegram_reminder_jobs
     SET status = 'sent', sent_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
}

export async function markReminderFailed(jobId: string, reason: string): Promise<void> {
  await db.query(
    `UPDATE telegram_reminder_jobs
     SET status = 'failed', failure_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    [reason, jobId]
  );
}

function offsetToType(offsetMinutes: number): ReminderType {
  if (offsetMinutes >= 1440) return 'day_before';
  if (offsetMinutes > 60) return 'day_of_lesson';
  if (offsetMinutes === 60) return 'hour_before';
  if (offsetMinutes >= 15) return 'fifteen_min_before';
  return 'lesson_start';
}
