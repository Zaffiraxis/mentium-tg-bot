-- Mntim Telegram Bot: MVP updates
-- Adds missing columns for platform events and updates reminder_type constraint

BEGIN;

-- telegram_user_settings: add MVP columns
ALTER TABLE telegram_user_settings
  ADD COLUMN IF NOT EXISTS is_linked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS last_platform_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_platform_visit_nudge_at TIMESTAMPTZ;

-- Back-fill is_linked for rows that already have a platform_user_id
UPDATE telegram_user_settings SET is_linked = TRUE WHERE platform_user_id IS NOT NULL;

-- Allow platform_user_id to be NULL (unlinked users can still exist in settings)
ALTER TABLE telegram_user_settings
  ALTER COLUMN platform_user_id DROP NOT NULL;

-- telegram_reminder_jobs: extend reminder_type to include day_of_lesson
ALTER TABLE telegram_reminder_jobs
  DROP CONSTRAINT IF EXISTS telegram_reminder_jobs_reminder_type_check;

ALTER TABLE telegram_reminder_jobs
  ADD CONSTRAINT telegram_reminder_jobs_reminder_type_check
  CHECK (reminder_type IN (
    'day_before', 'day_of_lesson', 'hour_before', 'fifteen_min_before',
    'lesson_start', 'inactivity', 'streak', 'interrupted_lesson'
  ));

COMMIT;
