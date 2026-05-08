/**
 * Structured logging for server and client.
 *
 * Contract: `createLogger(domain)` → methods `info|warn|error|debug(action, meta?)`
 * emit `console[level]('[domain:action]', { ...baseContext, ...meta })`.
 *
 * - `debug` is gated: production off unless `LOG_DEBUG` / `VITE_LOG_DEBUG` is `true`,
 *   or `import.meta.env.DEV` in the browser bundle.
 * - Use `maskEmail()` in client code; avoid logging secrets/tokens/passwords.
 */

function isDebugEnabled() {
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (String(process.env.LOG_DEBUG ?? '').toLowerCase() === 'true') {
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (String(import.meta.env.VITE_LOG_DEBUG ?? '').toLowerCase() === 'true') {
        return true;
      }
      if (import.meta.env.DEV === true) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function mergeContext(base, extra) {
  const out = { ...(base && typeof base === 'object' ? base : {}) };
  if (extra && typeof extra === 'object') {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) out[k] = v;
    }
  }
  return out;
}

/**
 * Partially mask an email for client-side logs (PII minimization).
 */
export function maskEmail(email) {
  if (email == null || typeof email !== 'string') return email;
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '***';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain) return '***';
  const shown =
    local.length <= 2 ? '**' : `${local.slice(0, 2)}***`;
  return `${shown}@${domain}`;
}

/**
 * Read correlation id from incoming Request (Render / proxies / Cloudflare).
 */
export function getRequestId(request) {
  try {
    const get = request?.headers?.get?.bind(request.headers);
    if (!get) return undefined;
    return (
      get('x-request-id') ||
      get('X-Request-Id') ||
      get('cf-ray') ||
      get('CF-Ray') ||
      undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * Accept either a `Request` or a loader/action-style `{ request }` object.
 */
export function getRequestFromRouteArg(arg) {
  if (arg instanceof Request) return arg;
  if (arg && typeof arg === 'object' && arg.request instanceof Request) {
    return arg.request;
  }
  return undefined;
}

/**
 * Normalize Error / unknown throwables for structured logs.
 */
export function errorMeta(err) {
  if (err == null) {
    return { code: null, message: 'unknown', stack: null };
  }
  if (typeof err === 'object') {
    return {
      code: err.code ?? null,
      message: err.message != null ? String(err.message) : String(err),
      stack: err.stack != null ? String(err.stack) : null,
    };
  }
  return { code: null, message: String(err), stack: null };
}

/**
 * @param {string} domain Short domain name (e.g. `mail`, `auth_resend_verification`).
 * @param {Record<string, unknown>} [baseContext] Merged into every log line (e.g. `{ requestId }`).
 */
export function createLogger(domain, baseContext = {}) {
  const tag = (action) => `[${domain}:${action}]`;

  function emit(level, action, meta) {
    const payload = mergeContext(baseContext, meta);
    const fn = console[level] ?? console.log;
    fn(tag(action), payload);
  }

  return {
    info(action, meta = {}) {
      emit('info', action, meta);
    },
    warn(action, meta = {}) {
      emit('warn', action, meta);
    },
    error(action, meta = {}) {
      emit('error', action, meta);
    },
    debug(action, meta = {}) {
      if (!isDebugEnabled()) return;
      emit('debug', action, meta);
    },
    child(overrides = {}) {
      return createLogger(domain, mergeContext(baseContext, overrides));
    },
  };
}
