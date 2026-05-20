import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PLATFORM_API_URL: z.string().url(),
  PLATFORM_FRONTEND_URL: z.string().url(),
  INTERNAL_TELEGRAM_API_KEY: z.string().min(1),
  PUBLIC_BOT_URL: z.string().url().optional(),
  DEFAULT_TIMEZONE: z.string().default('Europe/Kiev'),
  FIXED_LESSON_DURATION_MINUTES: z.coerce.number().default(50),
  DAY_OF_LESSON_OFFSET_MINUTES: z.coerce.number().default(180),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4001),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  TELEGRAM_USE_POLLING: z.string().transform(v => v === 'true').default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Lesson duration is always fixed — never accept overrides from runtime
export const FIXED_LESSON_DURATION_MINUTES = 50;
