# Railway Deployment Guide — Mntim Telegram Bot

## Overview

The bot deploys as a **separate Railway service** inside your existing Railway project alongside the main frontend, backend, Postgres, and Redis services.

Two processes are available:

| Process | Command | What it does |
|---|---|---|
| **web** | `npm run start` | HTTP server (health + webhook + internal API) + Telegram bot |
| **worker** | `npm run worker` | BullMQ reminder worker only |

> **Important:** Do not run both `npm run start` AND `npm run worker` in the same Railway service. The web process already includes the worker. Use a separate Railway service only if you want to scale the worker independently.

---

## 1. Add the Bot as a New Railway Service

1. Open [railway.app](https://railway.app) and select your existing project.
2. Click **+ New** → **GitHub Repo**.
3. Select your repo and set the **Root Directory** to `tg-bot` (or wherever this folder lives).
4. Railway will detect `package.json` and use Nixpacks automatically.

**Build command** (Railway detects automatically, or set manually):
```
npm run build
```

**Start command** (set in Railway service settings):
```
npm run start
```

---

## 2. Required Environment Variables

Set these in the Railway service's **Variables** tab:

| Variable | Required | Value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | From BotFather |
| `TELEGRAM_BOT_USERNAME` | — | Bot username (without @) |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ | Generate: `openssl rand -hex 32` |
| `TELEGRAM_USE_POLLING` | ✅ | `false` (webhook mode for Railway) |
| `DATABASE_URL` | ✅ | See section 4 |
| `REDIS_URL` | ✅ | See section 5 |
| `PLATFORM_FRONTEND_URL` | ✅ | e.g. `https://mntim.app` |
| `PLATFORM_API_URL` | ✅ | e.g. `https://api.mntim.app` |
| `INTERNAL_TELEGRAM_API_KEY` | ✅ | Generate: `openssl rand -hex 32` |
| `PUBLIC_BOT_URL` | ✅ | Your Railway bot domain (see section 8) |
| `DEFAULT_TIMEZONE` | — | `Europe/Kiev` |
| `FIXED_LESSON_DURATION_MINUTES` | — | `50` (do not change) |
| `DAY_OF_LESSON_OFFSET_MINUTES` | — | `180` |
| `PORT` | — | Railway sets this automatically |
| `NODE_ENV` | ✅ | `production` |
| `LOG_LEVEL` | — | `info` |

---

## 3. Connect DATABASE_URL from Existing Postgres

1. In your Railway project, open the **Postgres** service.
2. Go to **Variables** → copy `DATABASE_URL`.
3. In the bot service Variables tab, add:
   ```
   DATABASE_URL = <paste value>
   ```
   Or use Railway's **Reference Variable** feature:
   - Variable name: `DATABASE_URL`
   - Value: `${{Postgres.DATABASE_URL}}`

---

## 4. Connect REDIS_URL from Existing Redis

1. In your Railway project, open the **Redis** service.
2. Go to **Variables** → copy `REDIS_URL`.
3. In the bot service Variables tab, add:
   ```
   REDIS_URL = <paste value>
   ```
   Or use Reference Variable:
   ```
   REDIS_URL = ${{Redis.REDIS_URL}}
   ```

> The bot handles `redis://`, `rediss://` (TLS), and password-protected URLs automatically.

---

## 5. Run Migrations

Migrations create the 5 `telegram_*` tables. They do NOT touch any main platform tables.

**Run once after first deploy:**

Option A — from your local machine (with DATABASE_URL set):
```bash
DATABASE_URL="<your-railway-postgres-url>" npm run db:migrate
```

Option B — Railway one-off command (in service shell):
```bash
node dist/db/migrate.js
```

Option C — Add as Railway **Deploy Command** (runs before start):
```
npm run build && node dist/db/migrate.js
```

Tables created:
- `telegram_links`
- `telegram_user_settings`
- `telegram_study_schedules`
- `telegram_reminder_jobs`
- `telegram_events`

---

## 6. Test `/health`

After deploy, Railway assigns a public domain. Test:

```bash
curl https://<your-bot-domain>.up.railway.app/health
```

Expected response:
```json
{ "ok": true, "service": "mntim-telegram-bot" }
```

If you get `503`, the bot cannot reach Postgres — check `DATABASE_URL`.

---

## 7. Switch from Polling to Webhook

For Railway production, always use webhook mode:

```
TELEGRAM_USE_POLLING=false
PUBLIC_BOT_URL=https://<your-bot-domain>.up.railway.app
TELEGRAM_WEBHOOK_SECRET=<your-random-secret>
```

The webhook URL will be:
```
https://<your-bot-domain>.up.railway.app/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
```

The bot registers this webhook automatically on startup when `TELEGRAM_USE_POLLING=false`.

---

## 8. Run `telegram:set-webhook` (Manual)

If you need to manually register or re-register the webhook:

**Local (with ts-node):**
```bash
PUBLIC_BOT_URL=https://<your-bot-domain>.up.railway.app \
TELEGRAM_BOT_TOKEN=<token> \
TELEGRAM_WEBHOOK_SECRET=<secret> \
npm run telegram:set-webhook
```

**After build (no ts-node needed):**
```bash
PUBLIC_BOT_URL=https://<your-bot-domain>.up.railway.app \
TELEGRAM_BOT_TOKEN=<token> \
TELEGRAM_WEBHOOK_SECRET=<secret> \
node dist/scripts/setWebhook.js
```

---

## 9. Verify Bot Receives `/start`

1. Open Telegram and message your bot.
2. Send `/start`.
3. Expected: welcome message with "Open Mntim" and "Discover More" buttons.
4. "Open Mntim" should open: `https://<PLATFORM_FRONTEND_URL>/tg-connect?token=<uuid>&source=telegram&action=start`

If the bot doesn't respond:
- Check Railway logs (`railway logs`)
- Confirm webhook is registered: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Confirm `PUBLIC_BOT_URL` matches the actual Railway domain

---

## 10. Common Errors

### `wrong TELEGRAM_BOT_TOKEN`
```
Error: 401: Unauthorized
```
Re-check token from BotFather. Make sure there are no trailing spaces.

### `missing PUBLIC_BOT_URL`
```
Error: PUBLIC_BOT_URL is required when TELEGRAM_USE_POLLING=false
```
Set `PUBLIC_BOT_URL` to your Railway bot service's public domain.

### `webhook secret mismatch`
Telegram sends updates to the wrong URL or with the wrong secret.
- Delete and re-register webhook: `npm run telegram:delete-webhook && npm run telegram:set-webhook`
- Ensure `TELEGRAM_WEBHOOK_SECRET` matches in both the URL and env var.

### `Redis connection failed`
```
Error: connect ECONNREFUSED
```
- Confirm `REDIS_URL` is set and references the Railway Redis service.
- Check that the Redis service is running in Railway.
- Railway Redis URLs include a password — the bot handles this automatically.

### `Postgres migration failed`
```
Error: relation "telegram_links" does not exist
```
Migrations haven't run yet. Run `node dist/db/migrate.js` (see section 5).

### `process.env.PORT not used`
The bot listens on `process.env.PORT || 4001`. Railway sets `PORT` automatically. Do not hardcode 4001.

---

## 11. Running Worker as Separate Railway Service (Optional)

By default, the web process (`npm run start`) includes the BullMQ worker. This is sufficient for most deployments.

If you want to scale the worker independently:

**Web service** — set Start Command to:
```
npm run start
```
Add env var: `START_WORKER=false` (not yet implemented — see Future Tasks)

**Worker service** — add a new Railway service from the same repo/folder, set Start Command to:
```
npm run worker
```

> **Warning:** Do NOT run both `npm run start` AND `npm run worker` targeting the same Redis queue without disabling the worker in the web process. This will cause duplicate reminder sends.

---

## 12. How the Backend Connects to the Bot

All bot internal endpoints require:
```
Authorization: Bearer <INTERNAL_TELEGRAM_API_KEY>
```

### Endpoints the backend calls:

| Method | Path | When to call |
|---|---|---|
| POST | `/internal/telegram/linked` | When user links Telegram account on platform |
| POST | `/internal/events/platform-visited` | When a linked user visits the platform |
| POST | `/internal/events/user-registered` | When a Telegram user completes platform registration |
| POST | `/internal/events/paid-lesson-purchased` | When a lesson purchase is confirmed |
| POST | `/internal/events/subscription-updated` | When subscription status changes |

### Legacy link-token endpoint (existing backend integration):
```
POST /api/internal/telegram/link-confirmed
Body: { "linkToken": "<uuid>", "platformUserId": "...", "name": "..." }
```

---

## 13. Railway Acceptance Checklist

- [ ] Bot builds successfully (`npm run build`)
- [ ] Bot starts with `process.env.PORT` (not hardcoded 4001)
- [ ] `GET /health` returns `{ "ok": true, "service": "mntim-telegram-bot" }`
- [ ] Bot connects to Railway Postgres via `DATABASE_URL`
- [ ] Bot connects to Railway Redis via `REDIS_URL`
- [ ] Migrations create only `telegram_*` tables
- [ ] `/start` works in Telegram
- [ ] "Open Mntim" creates a tracked `tg-connect` link
- [ ] "Discover More" sends product description
- [ ] Internal endpoints require `INTERNAL_TELEGRAM_API_KEY`
- [ ] Schedule wizard works (days → time → save)
- [ ] Lesson duration is always 50 minutes
- [ ] Day-of-lesson reminder fires correctly
- [ ] 1-hour-before reminder fires correctly
- [ ] Changing schedule cancels old jobs and creates new ones
- [ ] Bot never creates lesson sessions
- [ ] Bot never calls AI/STT/TTS
- [ ] Bot never processes payments
