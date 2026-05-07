import pg from 'pg';

const envInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Prefer IPv4 loopback when the URL uses `localhost`. On many Windows/Node setups
 * `localhost` resolves to `::1` first; a Postgres bound only on 127.0.0.1 yields
 * connection failures surfaced as `AggregateError` with an empty `.message`.
 */
function normalizeDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/@localhost(?=[:/?#]|$)/gi, '@127.0.0.1');
}

const rawUrl = String(process.env.DATABASE_URL ?? '').trim();
const connectionString = normalizeDatabaseUrl(rawUrl || undefined);

if (!rawUrl) {
  console.warn(
    '[SurveyTasker] DATABASE_URL is empty. Set it in apps/web/.env — sign-up and auth will fail until PostgreSQL is configured.',
  );
}

const useSsl =
  /neon\.tech|neon\.aws|sslmode=require|sslmode=verify-full|ssl=true/i.test(
    connectionString ?? '',
  ) || String(process.env.DATABASE_SSL ?? '').toLowerCase() === 'true';

/**
 * Shared pg pool for Auth.js adapter + any direct `pool.query` usage.
 * Keeps connection usage predictable under concurrent requests.
 */
const pool = new pg.Pool({
  connectionString,
  max: envInt(process.env.DB_POOL_MAX, 20),
  idleTimeoutMillis: envInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMillis: envInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10_000),
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

export default pool;
