import postgres from 'postgres';
import { getNormalizedDatabaseUrl } from '@/lib/databaseConnectionString';

const NullishQueryFunction = () => {
  throw new Error(
    'No database connection string was provided. Set process.env.DATABASE_URL (e.g. in apps/web/.env).',
  );
};
NullishQueryFunction.begin = () => {
  throw new Error(
    'No database connection string was provided. Set process.env.DATABASE_URL (e.g. in apps/web/.env).',
  );
};

const withTimeout = (promise, timeoutMs) => {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Database query timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const queryTimeoutMs = Number.parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '15000', 10);
const txTimeoutMs = Number.parseInt(
  process.env.DB_TRANSACTION_TIMEOUT_MS || String(Math.max(queryTimeoutMs * 3, 30000)),
  10,
);

const envInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const connectionString = getNormalizedDatabaseUrl();

const raw =
  connectionString &&
  postgres(connectionString, {
    max: envInt(process.env.DB_POOL_MAX, 20),
    // postgres.js uses seconds for these timeouts.
    idle_timeout: Math.max(
      1,
      Math.floor(envInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30_000) / 1000),
    ),
    connect_timeout: Math.max(
      1,
      Math.floor(envInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10_000) / 1000),
    ),
    // Transaction pooling (PgBouncer) is common in local + serverless setups.
    prepare: false,
  });

const sql = raw
  ? (...args) => withTimeout(raw(...args), queryTimeoutMs)
  : NullishQueryFunction;

if (raw) {
  sql.begin = (fn) => withTimeout(raw.begin(fn), txTimeoutMs);
}

export default sql;
