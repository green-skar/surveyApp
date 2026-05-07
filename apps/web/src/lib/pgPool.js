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
  const localNormalized = url.replace(/@localhost(?=[:/?#]|$)/gi, '@127.0.0.1');
  try {
    const parsed = new URL(localNormalized);
    const isLocalHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(parsed.hostname);
    const hasSslMode = parsed.searchParams.has('sslmode');
    if (!isLocalHost && !hasSslMode) {
      parsed.searchParams.set('sslmode', 'require');
      return parsed.toString();
    }
    return localNormalized;
  } catch {
    return localNormalized;
  }
}

const rawUrl = String(process.env.DATABASE_URL ?? '').trim();
const connectionString = normalizeDatabaseUrl(rawUrl || undefined);

if (!rawUrl) {
  console.warn(
    '[SurveyTasker] DATABASE_URL is empty. Set it in apps/web/.env — sign-up and auth will fail until PostgreSQL is configured.',
  );
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

const sslExplicitlyDisabled = /sslmode=disable|ssl=false/i.test(connectionString ?? '');

const useSsl =
  String(process.env.DATABASE_SSL ?? '').toLowerCase() === 'true' ||
  (!sslExplicitlyDisabled &&
    (isRemoteDbHost ||
      /neon\.tech|neon\.aws|sslmode=require|sslmode=verify-full|ssl=true/i.test(
        connectionString ?? '',
      )));

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
  // #region agent log
  fetch('http://127.0.0.1:7792/ingest/21049abd-be9c-4828-94c7-488dccea2750',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'836783'},body:JSON.stringify({sessionId:'836783',runId:'pre-fix',hypothesisId:'H10',location:'src/lib/pgPool.js:59',message:'pg pool emitted error',data:{errorName:error?.name ?? null,errorMessage:error?.message ?? null,errorCode:error?.code ?? null,isRemoteDbHost,useSsl},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
});

export default pool;
