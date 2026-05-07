import { useCallback } from 'react';
import { signIn, signOut } from "@auth/create/react";

/**
 * Auth.js may redirect with a relative `data.url`. @hono/auth-js `signIn(..., { redirect: false })`
 * does `new URL(data.url)` which throws for relative URLs — normalize before calling `signIn`.
 */
function absoluteCallbackUrl(url) {
  if (url == null || typeof window === 'undefined') return url;
  const s = String(url).trim();
  if (!s) return url;
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${window.location.origin}${path}`;
}

function isDevIframe() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch { return true; }
}

function devSocialShim(provider, callbackUrl) {
  const params = new URLSearchParams({ provider });
  if (callbackUrl) params.set('callbackUrl', callbackUrl);
  window.location.href = '/__create/social-dev-shim?' + params;
}

function useAuth() {
  const callbackUrl = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('callbackUrl')
    : null;

  const signInWithCredentials = useCallback((options) => {
    const cb = absoluteCallbackUrl(callbackUrl ?? options?.callbackUrl);
    return signIn("credentials-signin", {
      ...options,
      callbackUrl: cb,
    });
  }, [callbackUrl])

  const signUpWithCredentials = useCallback((options) => {
    const cb = absoluteCallbackUrl(callbackUrl ?? options?.callbackUrl);
    // #region agent log
    fetch('http://127.0.0.1:7792/ingest/21049abd-be9c-4828-94c7-488dccea2750',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'836783'},body:JSON.stringify({sessionId:'836783',runId:'pre-fix',hypothesisId:'H1',location:'src/utils/useAuth.js:45',message:'signUpWithCredentials invoked',data:{hasEmail:Boolean(options?.email),hasName:Boolean(options?.name),redirect:options?.redirect ?? null,callbackUrl:cb ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return signIn("credentials-signup", {
      ...options,
      callbackUrl: cb,
    });
  }, [callbackUrl])

  const signInWithGoogle = useCallback((options) => {
    const cb = callbackUrl ?? options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("google", cb);
    return signIn("google", { ...options, callbackUrl: cb });
  }, [callbackUrl]);
  const signInWithFacebook = useCallback((options) => {
    const cb = options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("facebook", cb);
    return signIn("facebook", options);
  }, []);
  const signInWithTwitter = useCallback((options) => {
    const cb = options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("twitter", cb);
    return signIn("twitter", options);
  }, []);
  const signInWithApple = useCallback((options) => {
    const cb = callbackUrl ?? options?.callbackUrl;
    if (isDevIframe()) return devSocialShim("apple", cb);
    return signIn("apple", { ...options, callbackUrl: cb });
  }, [callbackUrl]);

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    signInWithFacebook,
    signInWithTwitter,
    signInWithApple,
    signOut,
  }
}

export default useAuth;