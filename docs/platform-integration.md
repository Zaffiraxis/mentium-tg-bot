# Mntim Telegram Bot — Platform Integration Guide

## Overview

The Telegram bot is a standalone retention and onboarding layer. It works independently without any platform backend configured. Platform integration is optional and added later via internal events.

**Telegram is never the source of truth.** Auth, registration, payment, lessons, AI, Classroom, progress, and subscription state all live on the Mntim platform.

---

## Standalone operation

The bot runs without a connected platform backend. All reminder scheduling and schedule storage are local. Platform API calls (`PLATFORM_API_URL`) are optional — if the URL is not set or the call fails, the bot logs a warning and continues without crashing.

---

## Platform frontend requirement

When a user clicks "Open Mntim" from the bot (unlinked), the bot sends them to:

```
PLATFORM_FRONTEND_URL/tg-connect?token=<token>&source=telegram&action=start
```

The platform frontend must:

1. Detect the `token` query param on the `/tg-connect` route.
2. Require the user to authenticate (login or register).
3. After authentication, call the bot's internal endpoint (see below) with the resolved `platformUserId` and `linkToken`.

---

## Internal endpoints

All internal endpoints require:

```
Authorization: Bearer <INTERNAL_TELEGRAM_API_KEY>
```

Missing or invalid key returns `401`.

### POST /internal/telegram/linked

Called by the platform after a user authenticates via the tg-connect flow.

**Request body:**
```json
{
  "linkToken": "uuid-token-from-url",
  "platformUserId": "user_123",
  "name": "Alex"
}
```

**Response:**
```json
{ "ok": true, "telegramLinked": true, "telegramChatId": "123456" }
```

**Bot behavior:** Sends the user a confirmation message and invites them to set their lesson schedule.

> Legacy alias: `POST /api/internal/telegram/link-confirmed` — same behavior, kept for backward compatibility.

---

### POST /internal/events/platform-visited

Optional. Called when a tracked user visits the platform but is not yet registered.

**Request body:**
```json
{
  "telegramChatId": "123456",
  "linkToken": "optional",
  "source": "telegram",
  "registered": false
}
```

**Bot behavior:** After a short configurable delay, sends a nudge: "I saw you opened Mntim 👀…". Anti-spam: max once per user per 24 hours. If `registered: true`, the nudge is skipped.

---

### POST /internal/events/user-registered

Called when a user completes registration on the platform.

**Request body:**
```json
{
  "telegramChatId": "123456",
  "platformUserId": "user_123",
  "name": "Alex",
  "subscriptionStatus": "free"
}
```

**Bot behavior:** Marks the user as linked, updates subscription status, sends account-connected confirmation and schedule invitation.

---

### POST /internal/events/paid-lesson-purchased

Called when a user purchases a paid lesson.

**Request body:**
```json
{
  "telegramChatId": "123456",
  "platformUserId": "user_123",
  "lessonAccess": "single_paid_lesson",
  "lessonDurationMinutes": 50
}
```

**Bot behavior:** Sends "Your paid lesson is ready 🎉" and invites user to set a reminder time. The bot does **not** create or validate the lesson — it only schedules reminders. Lesson duration is always 50 minutes regardless of what is sent.

---

### POST /internal/events/subscription-updated

Called when a user's subscription status changes.

**Request body:**
```json
{
  "telegramChatId": "123456",
  "platformUserId": "user_123",
  "subscriptionStatus": "free" | "active" | "expired"
}
```

**Bot behavior:** Updates stored subscription status silently. No message sent.

---

## Reminder links

All reminder messages send users back to the Mntim platform:

```
PLATFORM_FRONTEND_URL/learning?source=telegram&action=reminder&type=<type>
```

Types: `day_of_lesson`, `hour_before`, `day_before`, `fifteen_min`, `lesson_start`, `inactivity`, `interrupted`.

The bot **never** creates lesson sessions. It only provides links that redirect to the platform.

---

## Absolute constraints

- Bot never calls Claude, STT, or TTS.
- Bot never creates lesson sessions.
- Bot never marks payment as successful by itself.
- Bot never treats Telegram username as secure identity.
- Bot never bypasses platform auth.
- Bot only reacts to trusted internal events authenticated with `INTERNAL_TELEGRAM_API_KEY`.
- Lesson duration is always fixed at 50 minutes. The bot ignores any other value.

---

## Optional platform API callbacks

The bot may call the platform backend for:

- `notifyScheduleUpdated()` — after user saves a schedule.
- `getUserSummary()` — for `/status` command.
- `getNextLessonLink()` — for `/next` command.

If `PLATFORM_API_URL` is not configured or any call fails, the bot logs a warning and continues. Bot functionality is never blocked by platform API availability.
