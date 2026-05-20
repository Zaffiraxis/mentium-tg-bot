-- AI Teacher Telegram Bot: Initial Schema
-- Run with: npm run migrate

BEGIN;

CREATE TABLE IF NOT EXISTS telegram_links (
  id              BIGSERIAL PRIMARY KEY,
  link_token      TEXT NOT NULL UNIQUE,
  telegram_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'expired', 'cancelled')),
  platform_user_id TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_token ON telegram_links (link_token);
CREATE INDEX IF NOT EXISTS idx_telegram_links_chat_id ON telegram_links (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_links_expires ON telegram_links (expires_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS telegram_user_settings (
  id               BIGSERIAL PRIMARY KEY,
  platform_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL UNIQUE,
  timezone         TEXT NOT NULL DEFAULT 'Europe/Kiev',
  language         TEXT NOT NULL DEFAULT 'en',
  is_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_settings_chat ON telegram_user_settings (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_tg_settings_user ON telegram_user_settings (platform_user_id);

CREATE TABLE IF NOT EXISTS telegram_study_schedules (
  id                        BIGSERIAL PRIMARY KEY,
  platform_user_id          TEXT NOT NULL,
  telegram_chat_id          TEXT NOT NULL,
  study_days                JSONB NOT NULL DEFAULT '[]',
  study_time                TEXT NOT NULL,
  lesson_duration_minutes   INTEGER NOT NULL DEFAULT 50 CHECK (lesson_duration_minutes = 50),
  reminder_offsets_minutes  JSONB NOT NULL DEFAULT '[1440, 60, 15]',
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_schedule_chat ON telegram_study_schedules (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_tg_schedule_user ON telegram_study_schedules (platform_user_id);
CREATE INDEX IF NOT EXISTS idx_tg_schedule_active ON telegram_study_schedules (is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS telegram_reminder_jobs (
  id               BIGSERIAL PRIMARY KEY,
  platform_user_id TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  schedule_id      BIGINT REFERENCES telegram_study_schedules(id) ON DELETE CASCADE,
  reminder_type    TEXT NOT NULL CHECK (reminder_type IN (
    'day_before', 'hour_before', 'fifteen_min_before',
    'lesson_start', 'inactivity', 'streak',
    'interrupted_lesson'
  )),
  scheduled_for    TIMESTAMPTZ NOT NULL,
  sent_at          TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  failure_reason   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_reminder_chat ON telegram_reminder_jobs (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_tg_reminder_pending ON telegram_reminder_jobs (scheduled_for, status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS telegram_events (
  id               BIGSERIAL PRIMARY KEY,
  platform_user_id TEXT,
  telegram_chat_id TEXT NOT NULL,
  event_type       TEXT NOT NULL,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_events_chat ON telegram_events (telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_tg_events_type ON telegram_events (event_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_telegram_links_updated
    BEFORE UPDATE ON telegram_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_telegram_user_settings_updated
    BEFORE UPDATE ON telegram_user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_telegram_study_schedules_updated
    BEFORE UPDATE ON telegram_study_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_telegram_reminder_jobs_updated
    BEFORE UPDATE ON telegram_reminder_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
