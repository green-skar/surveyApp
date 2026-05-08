import pg from 'pg';
import {
  getNormalizedDatabaseUrl,
  isLikelyPrivateRenderPostgresHost,
} from './databaseConnectionString.js';
import { createLogger, errorMeta } from '@/lib/logger';

const dbLog = createLogger('db');

const envInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const rawUrl = String(process.env.DATABASE_URL ?? '').trim();
const connectionString = getNormalizedDatabaseUrl() || undefined;

if (!rawUrl) {
  dbLog.warn('database_url_empty', {
    message:
      'Set DATABASE_URL in apps/web/.env — sign-up and auth will fail until PostgreSQL is configured.',
  });
}

const isRemoteDbHost = (() => {
  try {
    if (!connectionString) return false;
    const { hostname } = new URL(connectionString);
    return !/^(localhost|127\.0\.0\.1|::1)$/i.test(hostname);
  } catch {
    return false;
  }
})();

const isPrivateRenderPostgresHost = (() => {
  try {
    if (!connectionString) return false;
    const { hostname } = new URL(connectionString);
    return isLikelyPrivateRenderPostgresHost(hostname);
  } catch {
    return false;
  }
})();

const sslExplicitlyDisabled = /sslmode=disable|ssl=false/i.test(connectionString ?? '');

const wantsSslFromUrl = /neon\.tech|neon\.aws|sslmode=require|sslmode=verify-full|ssl=true/i.test(
  connectionString ?? '',
);

const useSsl =
  String(process.env.DATABASE_SSL ?? '').toLowerCase() === 'true' ||
  (!sslExplicitlyDisabled &&
    (wantsSslFromUrl || (isRemoteDbHost && !isPrivateRenderPostgresHost)));

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

pool.on('error', (error) => {
  dbLog.error('pool_error', {
    ...errorMeta(error),
    isRemoteDbHost,
    useSsl,
  });
});

export default pool;
