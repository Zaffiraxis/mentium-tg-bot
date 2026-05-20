# AI Teacher Telegram Bot

Telegram Habit & Retention Bot for the AI Teacher platform.

**What it does:** onboarding, account linking, study schedule, reminders, streak nudges, reactivation.

**What it does NOT do:** AI lessons, Claude/STT/TTS, lesson session creation, auth bypass.

One lesson = **50 minutes** (fixed, never configurable by users).

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))

### Install

```bash
cd tg-bot
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env and fill in all required values
```

Required values — see [Environment Variables](#environment-variables).

### Migrate database

```bash
npm run migrate
```

### Run (development — polling mode)

```bash
TELEGRAM_USE_POLLING=true npm run dev
```

### Run (production — webhook mode)

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | From BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ | Random secret for webhook URL security |
| `TELEGRAM_BOT_USERNAME` | — | Bot username without @ |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `PLATFORM_API_URL` | ✅ | Main AI Teacher backend URL |
| `PLATFORM_FRONTEND_URL` | ✅ | Main AI Teacher frontend URL |
| `INTERNAL_TELEGRAM_API_KEY` | ✅ | Shared secret for bot ↔ platform internal API |
| `DEFAULT_TIMEZONE` | — | Default `Europe/Kiev` |
| `FIXED_LESSON_DURATION_MINUTES` | — | Always `50`, do not change |
| `PORT` | — | Default `4001` |
| `TELEGRAM_USE_POLLING` | — | Set `true` for local dev |

---

## Telegram BotFather Setup

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot`
3. Choose a name, e.g. `AI Teacher Bot`
4. Choose a username, e.g. `ai_teacher_study_bot`
5. Copy the **token** → paste as `TELEGRAM_BOT_TOKEN` in `.env`
6. Set bot commands:

```
/setcommands
```

Paste:

```
start - Connect your AI Teacher account
connect - Link AI Teacher account
schedule - Set up study schedule
reschedule - Change your schedule
status - View your learning status
next - Get link to next lesson
stop - Disable reminders
help - Show available commands
```

---

## Webhook Setup (production)

Your bot service must be reachable at a public HTTPS URL.

Set the webhook:

```bash
BOT_SERVICE_URL=https://your-bot.example.com npm run telegram:set-webhook
```

Telegram will send all updates to:

```
https://your-bot.example.com/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
```

Delete webhook (switch to polling):

```bash
npm run telegram:delete-webhook
```

---

## Docker

Build:

```bash
docker build -t ai-teacher-tg-bot .
```

Run:

```bash
docker run -d \
  --env-file .env \
  -p 4001:4001 \
  ai-teacher-tg-bot
```

Health check:

```bash
curl http://localhost:4001/health
# {"ok":true,"service":"ai-teacher-telegram-bot"}
```

---

## Platform Integration Guide

### What you need to add to the main platform

#### 1. Telegram link confirmation endpoint

When a user opens `/tg-connect?token=...` and authenticates, the frontend calls:

```
POST /api/integrations/telegram/link
Authorization: Bearer <user_jwt>
Content-Type: application/json

{"linkToken": "abc123"}
```

Your backend validates the JWT, gets `platformUserId`, then calls the bot service:

```
POST http://bot-service:4001/api/internal/telegram/link-confirmed
Authorization: Bearer <INTERNAL_TELEGRAM_API_KEY>
Content-Type: application/json

{"linkToken": "abc123", "platformUserId": "user_123"}
```

The bot service confirms the link and sends a welcome message to the user in Telegram.

#### 2. User summary endpoint (bot calls this)

```
GET /api/internal/telegram/users/:telegramChatId/summary
Authorization: Bearer <INTERNAL_TELEGRAM_API_KEY>
```

Response:

```json
{
  "platformUserId": "user_123",
  "name": "Alex",
  "telegramLinked": true,
  "subscriptionStatus": "free",
  "demoLessonsCompleted": 0,
  "lessonsCompleted": 3,
  "currentBook": "Focus 2",
  "currentSection": "1.2",
  "currentSectionTitle": "Daily routines",
  "xp": 120,
  "rank": "New Learner",
  "streakDays": 2,
  "lastLessonAt": "2026-05-17T15:00:00Z"
}
```

#### 3. Next lesson link endpoint (bot calls this)

```
GET /api/internal/telegram/users/:telegramChatId/next-lesson-link
Authorization: Bearer <INTERNAL_TELEGRAM_API_KEY>
```

Response:

```json
{
  "url": "https://platform.com/learning",
  "label": "Continue learning"
}
```

#### 4. Schedule update notification (bot calls this)

```
POST /api/internal/telegram/schedule-updated
Authorization: Bearer <INTERNAL_TELEGRAM_API_KEY>

{
  "telegramChatId": "123456",
  "platformUserId": "user_123",
  "timezone": "Europe/Kiev",
  "studyDays": ["monday", "thursday"],
  "studyTime": "18:00",
  "lessonDurationMinutes": 50,
  "reminderOffsetsMinutes": [1440, 60, 15]
}
```

---

## Frontend Integration Guide

### Add the `/tg-connect` route

This page handles the Telegram account linking flow.

```
/tg-connect?token=<link_token>
```

Behavior:

1. Read `token` from URL query params
2. Save to `sessionStorage` as `pendingTelegramLinkToken`
3. If user is not authenticated → show Google auth / login
4. After authentication → call:

```
POST /api/integrations/telegram/link
Authorization: Bearer <user_jwt>

{"linkToken": "<token from sessionStorage>"}
```

5. Show success state:

```
✅ Telegram connected successfully.
You can now return to Telegram to set your schedule.
```

**Rules:**
- Do NOT auto-start a lesson after linking
- Do NOT create a lesson session after linking
- Do NOT consume AI tokens during linking

### Click tracking

All Telegram links include tracking params:

```
?source=telegram&action=reminder&type=hour_before
```

Log these in your analytics.

---

## API Contract Summary

### Bot → Platform (internal, needs `INTERNAL_TELEGRAM_API_KEY`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/internal/telegram/users/:chatId/summary` | User learning summary |
| GET | `/api/internal/telegram/users/:chatId/next-lesson-link` | Next lesson URL |
| POST | `/api/internal/telegram/schedule-updated` | Schedule change notification |

### Platform → Bot (internal, needs `INTERNAL_TELEGRAM_API_KEY`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/internal/telegram/link-confirmed` | Confirm account link after platform auth |

### Platform → Platform (user auth, needs user JWT)

| Method | Path | Description |
|---|---|---|
| POST | `/api/integrations/telegram/link` | User-initiated account link |

---

## Database Schema

Tables created by `npm run migrate`:

- `telegram_links` — link tokens (pending → linked/expired)
- `telegram_user_settings` — per-user settings (timezone, enabled)
- `telegram_study_schedules` — study schedules (days, time, reminders)
- `telegram_reminder_jobs` — scheduled reminder job records
- `telegram_events` — audit log of bot events

---

## Values Owner Must Provide

```
TELEGRAM_BOT_TOKEN          from BotFather
TELEGRAM_BOT_USERNAME       bot username (without @)
TELEGRAM_WEBHOOK_SECRET     generate a random string
PLATFORM_API_URL            your backend URL
PLATFORM_FRONTEND_URL       your frontend URL
INTERNAL_TELEGRAM_API_KEY   generate a random string
DATABASE_URL                PostgreSQL connection string
REDIS_URL                   Redis connection string
DEFAULT_TIMEZONE            e.g. Europe/Kiev
FIXED_LESSON_DURATION_MINUTES  50 (do not change)
```

---

## Acceptance Checklist

- [x] /start works, creates secure link token
- [x] /connect creates secure link token
- [x] Link token expires in 20 minutes
- [x] Link token is single-use
- [x] Account linked only after platform auth
- [x] Schedule setup: asks days → time → reminders (not duration)
- [x] Lesson duration always stored as 50, never asked from user
- [x] Reminder calculations use 50-minute lesson duration
- [x] Day-before, hour-before, 15-min, lesson-start reminders
- [x] Missed lesson flow
- [x] Interrupted lesson follow-up (max 1 per lesson)
- [x] Inactivity reminder (3 days)
- [x] /status shows learning summary
- [x] /stop disables reminders without deleting link
- [x] Bot never calls Claude/STT/TTS
- [x] Bot never creates paid AI lesson sessions
- [x] Internal API key required for all internal endpoints
- [x] All secrets are env-based, nothing hardcoded
- [x] /health endpoint
- [x] Dockerfile
- [x] Platform integration documented
- [x] Frontend route documented
