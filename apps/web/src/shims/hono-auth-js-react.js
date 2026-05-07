/**
 * @hono/auth-js@1.1.1 signIn(..., { redirect: false }) uses `new URL(data.url)`.
 * Auth.js often returns a relative `data.url` (e.g. /account/signin?...), which throws
 * in the browser and breaks credential sign-up/sign-in with redirect: false.
 *
 * Re-export the real module but replace signIn with a version that resolves relative URLs.
 */
import {
  authConfigManager,
  getCsrfToken,
  getProviders,
} from '@hono/auth-js/react';

export {
  SessionContext,
  SessionProvider,
  getSession,
  signOut,
  useOauthPopupLogin,
  useSession,
  authConfigManager,
  getCsrfToken,
  getProviders,
} from '@hono/auth-js/react';

function authErrorFromRedirectUrl(redirectUrl) {
  if (redirectUrl == null || redirectUrl === '') return null;
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(String(redirectUrl), base).searchParams.get('error');
  } catch {
    return null;
  }
}

async function signIn(provider, options = {}, authorizationParams = {}) {
  const { callbackUrl = window.location.href, redirect = true, ...opts } = options;
  const config = authConfigManager.getConfig();
  const href = `${config.baseUrl}${config.basePath}`;
  const providers = await getProviders();
  if (!providers) {
    window.location.href = `${href}/error`;
    return;
  }
  if (!provider || !(provider in providers)) {
    window.location.href = `${href}/signin?${new URLSearchParams({ callbackUrl })}`;
    return;
  }
  const isCredentials = providers[provider].type === 'credentials';
  const signInUrl = `${href}/${isCredentials ? 'callback' : 'signin'}/${provider}`;
  const csrfToken = await getCsrfToken();
  const res = await fetch(`${signInUrl}?${new URLSearchParams(authorizationParams)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      ...opts,
      csrfToken,
      callbackUrl,
    }),
    credentials: config.credentials,
  });
  const data = await res.json();
  if (redirect) {
    const url = data.url ?? callbackUrl;
    window.location.href = url;
    if (url.includes('#')) window.location.reload();
    return;
  }
  const error = authErrorFromRedirectUrl(data.url);
  if (res.ok) await config.fetchSession?.({ event: 'storage' });
  return {
    error,
    status: res.status,
    ok: res.ok,
    url: error ? null : data.url,
  };
}

export { signIn };
