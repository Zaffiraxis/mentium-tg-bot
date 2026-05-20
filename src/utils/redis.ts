import { env } from '../env';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls?: object;
}

export function parseRedisUrl(redisUrl: string): RedisConnectionOptions {
  const u = new URL(redisUrl);
  const opts: RedisConnectionOptions = {
    host: u.hostname,
    port: parseInt(u.port || '6379'),
  };
  if (u.password) opts.password = decodeURIComponent(u.password);
  if (u.username && u.username !== 'default') opts.username = decodeURIComponent(u.username);
  if (u.protocol === 'rediss:') opts.tls = {};
  return opts;
}

export function getRedisConnection(): RedisConnectionOptions {
  return parseRedisUrl(env.REDIS_URL);
}
