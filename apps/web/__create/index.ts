import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import nodeConsole from 'node:console';
import { skipCSRFCheck } from '@auth/core';
import { CredentialsSignin } from '@auth/core/errors';
import Credentials from '@auth/core/providers/credentials';
import { authHandler, initAuthConfig } from '@hono/auth-js';
import { hash, verify } from 'argon2';
import { Hono } from 'hono';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { proxy } from 'hono/proxy';
import { bodyLimit } from 'hono/body-limit';
import { requestId } from 'hono/request-id';
import { createHonoServer } from 'react-router-hono-server/node';
import { serializeError } from 'serialize-error';
import NeonAdapter from './adapter';
import { getHTMLForErrorPage } from './get-html-for-error-page';
import { sendVerificationEmail } from '../src/lib/sendVerificationEmail.js';
import pool from '../src/lib/pgPool.js';
import { API_BASENAME, api } from './route-builder';
const als = new AsyncLocalStorage<{ requestId: string }>();

for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = nodeConsole[method].bind(console);

  console[method] = (...args: unknown[]) => {
    const requestId = als.getStore()?.requestId;
    if (requestId) {
      original(`[traceId:${requestId}]`, ...args);
    } else {
      original(...args);
    }
  };
}

const adapter = NeonAdapter(pool);

if (!String(process.env.DATABASE_URL || '').trim()) {
  console.warn(
    '[SurveyTasker] DATABASE_URL is not set in apps/web/.env. Sign-in, sign-up, and SQL-backed APIs will fail until you add a PostgreSQL connection string (local Docker or hosted).',
  );
}
if (!String(process.env.AUTH_URL || '').trim()) {
  console.warn(
    '[SurveyTasker] AUTH_URL is not set. Auth token routes will assume http://localhost:4000 for secure-cookie decisions.',
  );
}

/** Browsers reject Secure cookies on http:// — required for local sign-in / CSRF. */
const secureCookies = String(process.env.AUTH_URL || '').startsWith('https');
const cookieSameSite = secureCookies ? 'none' : 'lax';

const app = new Hono();

app.use('*', requestId());

app.use('*', (c, next) => {
  const requestId = c.get('requestId');
  return als.run({ requestId }, () => next());
});

app.use(contextStorage());

app.onError((err, c) => {
  if (c.req.method !== 'GET') {
    return c.json(
      {
        error: 'An error occurred in your app',
        details: serializeError(err),
      },
      500
    );
  }
  return c.html(getHTMLForErrorPage(err), 200);
});

if (process.env.CORS_ORIGINS) {
  app.use(
    '/*',
    cors({
      origin: process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    })
  );
}
for (const method of ['post', 'put', 'patch'] as const) {
  app[method](
    '*',
    bodyLimit({
      maxSize: 12 * 1024 * 1024, // identity document uploads (JPG/PDF)
      onError: (c) => {
        return c.json({ error: 'Body size limit exceeded' }, 413);
      },
    })
  );
}

if (process.env.AUTH_SECRET) {
  app.use(
    '*',
    initAuthConfig(() => ({
      // Must match client + `app.use('/api/auth/*')`. Default Auth.js basePath is `/auth`, which breaks parsing.
      basePath: '/api/auth',
      trustHost: true,
      // Node / react-router-hono-server: use process.env. (c.env is for Workers bindings.)
      secret: process.env.AUTH_SECRET,
      pages: {
        signIn: '/account/signin',
        signOut: '/account/logout',
      },
      skipCSRFCheck,
      session: {
        strategy: 'jwt',
      },
      callbacks: {
        async signIn({ user, account }) {
          if (user && String((user as { id?: string }).id ?? '').startsWith('admin-')) {
            return true;
          }
          if (account?.provider === 'credentials' && user && !user.emailVerified) {
            return false;
          }
          return true;
        },
        async jwt({ token, user }) {
          if (user) {
            const u = user as {
              id?: string;
              mustChangePassword?: boolean;
              adminDbId?: number;
            };
            if (String(u.id ?? '').startsWith('admin-')) {
              token.role = 'admin';
              token.mustChangePassword = Boolean(u.mustChangePassword);
              token.adminDbId = u.adminDbId;
            } else {
              token.role = 'user';
              token.mustChangePassword = false;
              delete token.adminDbId;
            }
          }
          return token;
        },
        session({ session, token }) {
          if (token.sub) {
            session.user.id = token.sub;
          }
          session.user.email = token.email as string | undefined;
          session.user.name = token.name as string | undefined;
          session.user.image = token.picture as string | undefined;
          (session.user as { role?: string }).role = (token.role as string) || 'user';
          (session.user as { mustChangePassword?: boolean }).mustChangePassword = Boolean(
            token.mustChangePassword,
          );
          if (token.adminDbId != null) {
            (session.user as { adminDbId?: number }).adminDbId = Number(token.adminDbId);
          }
          return session;
        },
      },
      cookies: {
        csrfToken: {
          options: {
            secure: secureCookies,
            sameSite: cookieSameSite,
          },
        },
        sessionToken: {
          options: {
            secure: secureCookies,
            sameSite: cookieSameSite,
          },
        },
        callbackUrl: {
          options: {
            secure: secureCookies,
            sameSite: cookieSameSite,
          },
        },
      },
      providers: [
        // Dev-only provider for simulated social sign-in (Google, Facebook, etc.)
        // Creates or finds a user by email without requiring a password.
        ...(process.env.NEXT_PUBLIC_CREATE_ENV === 'DEVELOPMENT'
          ? [
              Credentials({
                id: 'dev-social',
                name: 'Development Social Sign-in',
                credentials: {
                  email: { label: 'Email', type: 'email' },
                  name: { label: 'Name', type: 'text' },
                  provider: { label: 'Provider', type: 'text' },
                },
                authorize: async (credentials) => {
                  const { email, name, provider } = credentials;
                  if (!email || typeof email !== 'string') return null;

                  const existing = await adapter.getUserByEmail(email);
                  if (existing) return existing;

                  const allowedProviders = new Set(['google', 'facebook', 'twitter', 'apple']);
                  const providerName =
                    typeof provider === 'string' && allowedProviders.has(provider.toLowerCase())
                      ? provider.toLowerCase()
                      : 'google';
                  const newUser = await adapter.createUser({
                    emailVerified: new Date(),
                    email,
                    name:
                      typeof name === 'string' && name.length > 0
                        ? name
                        : undefined,
                  });
                  await adapter.linkAccount({
                    type: 'oauth',
                    userId: newUser.id,
                    provider: providerName,
                    providerAccountId: `dev-${newUser.id}`,
                  });
                  return newUser;
                },
              }),
            ]
          : []),
        Credentials({
          id: 'admin-credentials',
          name: 'Admin',
          credentials: {
            username: { label: 'Username', type: 'text' },
            password: { label: 'Password', type: 'password' },
          },
          authorize: async (credentials) => {
            const username = credentials?.username;
            const password = credentials?.password;
            if (typeof username !== 'string' || typeof password !== 'string') return null;
            const trimmed = username.trim();
            if (!trimmed || !password) return null;
            const r = await pool.query(
              `SELECT id, username, password_hash, must_change_password
               FROM app_admins WHERE lower(username) = lower($1) LIMIT 1`,
              [trimmed],
            );
            if (r.rowCount === 0) return null;
            const row = r.rows[0] as {
              id: number;
              username: string;
              password_hash: string;
              must_change_password: boolean;
            };
            const ok = await verify(row.password_hash, password);
            if (!ok) return null;
            return {
              id: `admin-${row.id}`,
              email: `${row.username}@admin.surveytasker.local`,
              emailVerified: new Date(),
              name: row.username,
              mustChangePassword: Boolean(row.must_change_password),
              adminDbId: Number(row.id),
            };
          },
        }),
        Credentials({
          id: 'credentials-signin',
          name: 'Credentials Sign in',
          credentials: {
            email: {
              label: 'Email',
              type: 'email',
            },
            password: {
              label: 'Password',
              type: 'password',
            },
          },
          authorize: async (credentials) => {
            const { email, password } = credentials;
            if (!email || !password) {
              return null;
            }
            if (typeof email !== 'string' || typeof password !== 'string') {
              return null;
            }

            // logic to verify if user exists
            const user = await adapter.getUserByEmail(email);
            if (!user) {
              return null;
            }
            const matchingAccount = user.accounts.find(
              (account) => account.provider === 'credentials'
            );
            const accountPassword = matchingAccount?.password;
            if (!accountPassword) {
              return null;
            }

            const isValid = await verify(accountPassword, password);
            if (!isValid) {
              return null;
            }

            if (!user.emailVerified) {
              const err = new CredentialsSignin();
              err.code = 'unverified';
              throw err;
            }

            // return user object with the their profile data
            return user;
          },
        }),
        Credentials({
          id: 'credentials-signup',
          name: 'Credentials Sign up',
          credentials: {
            email: {
              label: 'Email',
              type: 'email',
            },
            password: {
              label: 'Password',
              type: 'password',
            },
            name: { label: 'Username', type: 'text' },
            image: { label: 'Image', type: 'text', required: false },
          },
          authorize: async (credentials) => {
            const { email, password, name, image } = credentials;
            if (!email || !password) {
              return null;
            }
            if (typeof email !== 'string' || typeof password !== 'string') {
              return null;
            }

            // logic to verify if user exists
            const user = await adapter.getUserByEmail(email);
            if (!user) {
              const newUser = await adapter.createUser({
                emailVerified: null,
                email,
                name: typeof name === 'string' && name.length > 0 ? name : undefined,
                image: typeof image === 'string' && image.length > 0 ? image : undefined,
              });
              await adapter.linkAccount({
                extraData: {
                  password: await hash(password),
                },
                type: 'credentials',
                userId: newUser.id,
                providerAccountId: newUser.id,
                provider: 'credentials',
              });
              const token = randomBytes(32).toString('hex');
              const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
              await adapter.createVerificationToken({
                identifier: email,
                token,
                expires,
              });
              await sendVerificationEmail({ to: email, token });
              return newUser;
            }
            return null;
          },
        }),
      ],
    }))
  );
}
app.all('/integrations/:path{.+}', async (c, next) => {
  const queryParams = c.req.query();
  const url = `${process.env.NEXT_PUBLIC_CREATE_BASE_URL ?? 'https://www.create.xyz'}/integrations/${c.req.param('path')}${Object.keys(queryParams).length > 0 ? `?${new URLSearchParams(queryParams).toString()}` : ''}`;

  return proxy(url, {
    method: c.req.method,
    body: c.req.raw.body ?? null,
    // @ts-expect-error -- duplex is accepted by the runtime even though the
    // type declarations don't include it; required for streaming integrations
    duplex: 'half',
    redirect: 'manual',
    headers: {
      ...c.req.header(),
      'X-Forwarded-For': process.env.NEXT_PUBLIC_CREATE_HOST,
      'x-createxyz-host': process.env.NEXT_PUBLIC_CREATE_HOST,
      Host: process.env.NEXT_PUBLIC_CREATE_HOST,
      'x-createxyz-project-group-id': process.env.NEXT_PUBLIC_PROJECT_GROUP_ID,
    },
  });
});

app.use('/api/auth/*', async (c, next) => {
  if (!process.env.AUTH_SECRET) {
    return c.json(
      {
        error:
          'Authentication is not configured: set AUTH_SECRET in your environment (e.g. .env).',
      },
      503,
    );
  }
  return authHandler()(c, next);
});
app.route(API_BASENAME, api);

export default await createHonoServer({
  app,
  defaultLogger: false,
});
