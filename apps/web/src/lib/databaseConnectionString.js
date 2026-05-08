/**
 * Shared DATABASE_URL normalization for `pg` (pgPool) and `postgres` (sql.js).
 *
 * Render private Postgres uses a short hostname like `dpg-xxxxx-a` (no dots).
 * The public URL uses `dpg-xxxxx.region-postgres.render.com`. Auto-appending
 * `sslmode=require` for all non-local hosts breaks TLS against the private host.
 */

/**
 * True when hostname looks like Render’s internal Postgres host (short `dpg-…`
 * name, not an FQDN). Matches URLs such as `@dpg-d7ucod50lvsc73cf4bi0-a/`.
 */
export function isLikelyPrivateRenderPostgresHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const h = hostname.trim();
  if (/^(localhost|127\.0\.0\.1|::1)$/i.test(h)) return false;
  return /^dpg-/i.test(h) && !h.includes('.');
}

/**
 * Prefer IPv4 loopback when the URL uses `localhost`.
 * For remote hosts, append `sslmode=require` only when not already set and not
 * a Render private Postgres hostname (see above).
 */
export function normalizeDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const localNormalized = url.replace(/@localhost(?=[:/?#]|$)/gi, '@127.0.0.1');
  try {
    const parsed = new URL(localNormalized);
    const isLocalHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(parsed.hostname);
    const hasSslMode = parsed.searchParams.has('sslmode');
    if (isLocalHost || hasSslMode) {
      return localNormalized;
    }
    if (isLikelyPrivateRenderPostgresHost(parsed.hostname)) {
      return localNormalized;
    }
    parsed.searchParams.set('sslmode', 'require');
    return parsed.toString();
  } catch {
    return localNormalized;
  }
}

/**
 * Trim and normalize `DATABASE_URL` for clients that read `process.env` directly.
 */
export function getNormalizedDatabaseUrl() {
  const raw = String(process.env.DATABASE_URL ?? '').trim();
  if (!raw) return '';
  return normalizeDatabaseUrl(raw);
}
