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

function authCodeFromRedirectUrl(redirectUrl) {
  if (redirectUrl == null || redirectUrl === '') return null;
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(String(redirectUrl), base).searchParams.get('code');
  } catch {
    return null;
  }
}

async function signIn(provider, options = {}, authorizationParams = {}) {
  const { callbackUrl = window.location.href, redirect = true, ...opts } = options;
  const config = authConfigManager.getConfig();
  const href = `${config.baseUrl}${config.basePath}`;
  // #region agent log
  fetch('http://127.0.0.1:7792/ingest/21049abd-be9c-4828-94c7-488dccea2750',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'836783'},body:JSON.stringify({sessionId:'836783',runId:'pre-fix',hypothesisId:'H2',location:'src/shims/hono-auth-js-react.js:43',message:'client signIn entry',data:{provider:provider ?? null,redirect,hasCallbackUrl:Boolean(callbackUrl),baseUrl:config?.baseUrl ?? null,basePath:config?.basePath ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const providers = await getProviders();
  // #region agent log
  fetch('http://127.0.0.1:7792/ingest/21049abd-be9c-4828-94c7-488dccea2750',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'836783'},body:JSON.stringify({sessionId:'836783',runId:'pre-fix',hypothesisId:'H2',location:'src/shims/hono-auth-js-react.js:47',message:'providers loaded',data:{providerCount:providers ? Object.keys(providers).length : 0,hasCredentialsSignup:Boolean(providers && providers['credentials-signup'])},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
  let csrfToken = undefined;
  try {
    csrfToken = await getCsrfToken();
  } catch (csrfError) {
    // #region agent log
    fetch('http://127.0.0.1:7792/ingest/21049abd-be9c-4828-94c7-488dccea2750',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'836783'},body:JSON.stringify({sessionId:'836783',runId:'pre-fix',hypothesisId:'H6',location:'src/shims/hono-auth-js-react.js:62',message:'csrf fetch failed, continuing without token',data:{errorName:csrfError?.name ?? null,errorMessage:csrfError?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }
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
  // #region agent log
  fetch('http://127.0.0.1:7792/ingest/21049abd-be9c-4828-94c7-488dccea2750',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'836783'},body:JSON.stringify({sessionId:'836783',runId:'pre-fix',hypothesisId:'H3',location:'src/shims/hono-auth-js-react.js:73',message:'signIn response received',data:{status:res.status,ok:res.ok,url:data?.url ?? null,errorFromUrl:authErrorFromRedirectUrl(data?.url ?? null),codeFromUrl:authCodeFromRedirectUrl(data?.url ?? null)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (redirect) {
    const url = data.url ?? callbackUrl;
    window.location.href = url;
    if (url.includes('#')) window.location.reload();
    return;
  }
  const error = authErrorFromRedirectUrl(data.url);
  const code = authCodeFromRedirectUrl(data.url);
  const normalizedError = error === 'CredentialsSignin' && code ? code : error;
  if (res.ok) await config.fetchSession?.({ event: 'storage' });
  return {
    error: normalizedError,
    status: res.status,
    ok: res.ok,
    url: normalizedError ? null : data.url,
  };
}

export { signIn };
