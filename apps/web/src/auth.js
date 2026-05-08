/**
 * Client-side JWT session helper (`@auth/create` is aliased to a small shim).
 * Credentials providers mirror `apps/web/__create/index.ts` (Hono + @hono/auth-js).
 */
import { randomBytes } from "node:crypto";
import CreateAuth from "@auth/create"
import Credentials from "@auth/core/providers/credentials"
import { CredentialsSignin } from '@auth/core/errors'
import pool from '@/lib/pgPool'
import { sendVerificationEmail } from '@/lib/sendVerificationEmail'
import { hash, verify } from 'argon2'

function credentialsSignin(code) {
  const err = new CredentialsSignin();
  err.code = code;
  return err;
}

function Adapter(client) {
  return {
    async createVerificationToken(
      verificationToken
    ) {
      const { identifier, expires, token } = verificationToken;
      const sql = `
        INSERT INTO auth_verification_token ( identifier, expires, token )
        VALUES ($1, $2, $3)
        `;
      await client.query(sql, [identifier, expires, token]);
      return verificationToken;
    },
    async useVerificationToken({
      identifier,
      token,
    }) {
      const sql = `delete from auth_verification_token
      where identifier = $1 and token = $2
      RETURNING identifier, expires, token `;
      const result = await client.query(sql, [identifier, token]);
      return result.rowCount !== 0 ? result.rows[0] : null;
    },

    async createUser(user) {
      const { name, email, emailVerified, image } = user;
      const sql = `
        INSERT INTO auth_users (name, email, "emailVerified", image)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, "emailVerified", image`;
      const result = await client.query(sql, [
        name,
        email,
        emailVerified,
        image,
      ]);
      return result.rows[0];
    },
    async getUser(id) {
      const sql = 'select * from auth_users where id = $1';
      try {
        const result = await client.query(sql, [id]);
        return result.rowCount === 0 ? null : result.rows[0];
      } catch {
        return null;
      }
    },
    async getUserByEmail(email) {
      const sql = 'select * from auth_users where email = $1';
      const result = await client.query(sql, [email]);
      if (result.rowCount === 0) {
        return null;
      }
      const userData = result.rows[0];
      const accountsData = await client.query(
        'select * from auth_accounts where "userId" = $1',
        [userData.id]
      );
      return {
        ...userData,
        accounts: accountsData.rows,
      };
    },
    async getUserByAccount({
      providerAccountId,
      provider,
    }) {
      const sql = `
          select u.* from auth_users u join auth_accounts a on u.id = a."userId"
          where
          a.provider = $1
          and
          a."providerAccountId" = $2`;

      const result = await client.query(sql, [provider, providerAccountId]);
      return result.rowCount !== 0 ? result.rows[0] : null;
    },
    async updateUser(user) {
      const fetchSql = 'select * from auth_users where id = $1';
      const query1 = await client.query(fetchSql, [user.id]);
      const oldUser = query1.rows[0];

      const newUser = {
        ...oldUser,
        ...user,
      };

      const { id, name, email, emailVerified, image } = newUser;
      const updateSql = `
        UPDATE auth_users set
        name = $2, email = $3, "emailVerified" = $4, image = $5
        where id = $1
        RETURNING name, id, email, "emailVerified", image
      `;
      const query2 = await client.query(updateSql, [
        id,
        name,
        email,
        emailVerified,
        image,
      ]);
      return query2.rows[0];
    },
    async linkAccount(account) {
      const sql = `
      insert into auth_accounts
      (
        "userId",
        provider,
        type,
        "providerAccountId",
        access_token,
        expires_at,
        refresh_token,
        id_token,
        scope,
        session_state,
        token_type,
        password
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning
        id,
        "userId",
        provider,
        type,
        "providerAccountId",
        access_token,
        expires_at,
        refresh_token,
        id_token,
        scope,
        session_state,
        token_type,
        password
      `;

      const params = [
        account.userId,
        account.provider,
        account.type,
        account.providerAccountId,
        account.access_token,
        account.expires_at,
        account.refresh_token,
        account.id_token,
        account.scope,
        account.session_state,
        account.token_type,
        account.extraData?.password,
      ];

      const result = await client.query(sql, params);
      return result.rows[0];
    },
    async createSession({ sessionToken, userId, expires }) {
      if (userId === undefined) {
        throw Error('userId is undef in createSession');
      }
      const sql = `insert into auth_sessions ("userId", expires, "sessionToken")
      values ($1, $2, $3)
      RETURNING id, "sessionToken", "userId", expires`;

      const result = await client.query(sql, [userId, expires, sessionToken]);
      return result.rows[0];
    },

    async getSessionAndUser(sessionToken) {
      if (sessionToken === undefined) {
        return null;
      }
      const result1 = await client.query(
        `select * from auth_sessions where "sessionToken" = $1`,
        [sessionToken]
      );
      if (result1.rowCount === 0) {
        return null;
      }
      const session = result1.rows[0];

      const result2 = await client.query(
        'select * from auth_users where id = $1',
        [session.userId]
      );
      if (result2.rowCount === 0) {
        return null;
      }
      const user = result2.rows[0];
      return {
        session,
        user,
      };
    },
    async updateSession(
      session
    ) {
      const { sessionToken } = session;
      const result1 = await client.query(
        `select * from auth_sessions where "sessionToken" = $1`,
        [sessionToken]
      );
      if (result1.rowCount === 0) {
        return null;
      }
      const originalSession = result1.rows[0];

      const newSession = {
        ...originalSession,
        ...session,
      };
      const sql = `
        UPDATE auth_sessions set
        expires = $2
        where "sessionToken" = $1
        `;
      const result = await client.query(sql, [
        newSession.sessionToken,
        newSession.expires,
      ]);
      return result.rows[0];
    },
    async deleteSession(sessionToken) {
      const sql = `delete from auth_sessions where "sessionToken" = $1`;
      await client.query(sql, [sessionToken]);
    },
    async unlinkAccount(partialAccount) {
      const { provider, providerAccountId } = partialAccount;
      const sql = `delete from auth_accounts where "providerAccountId" = $1 and provider = $2`;
      await client.query(sql, [providerAccountId, provider]);
    },
    async deleteUser(userId) {
      await client.query('delete from auth_users where id = $1', [userId]);
      await client.query('delete from auth_sessions where "userId" = $1', [
        userId,
      ]);
      await client.query('delete from auth_accounts where "userId" = $1', [
        userId,
      ]);
    },
  };
}
const adapter = Adapter(pool);

export const { auth } = CreateAuth({
  providers: [Credentials({
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

    const user = await adapter.getUserByEmail(email.trim());
    if (!user) {
      throw credentialsSignin('no-account');
    }
    const matchingAccount = user.accounts.find(
      (account) => account.provider === 'credentials'
    );
    const accountPassword = matchingAccount?.password;
    if (!accountPassword) {
      throw credentialsSignin('no-account');
    }

    const isValid = await verify(accountPassword, password);
    if (!isValid) {
      throw credentialsSignin('invalid-credentials');
    }

    if (!user.emailVerified) {
      throw credentialsSignin('unverified');
    }

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
    name: { label: 'Name', type: 'text', required: false },
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

    try {
      const user = await adapter.getUserByEmail(email.trim());
      if (user) {
        if (user.emailVerified) {
          throw credentialsSignin('email-already-verified');
        }
        throw credentialsSignin('pending-verification-signup');
      }

      const emailTrim = email.trim();
      const emailLower = emailTrim.toLowerCase();
      const displayName =
        typeof name === 'string' && name.trim().length > 0 ? name.trim() : '';
      const nameLower = displayName ? displayName.toLowerCase() : '';

      if (displayName) {
        const taken = await pool.query(
          `SELECT 1 FROM auth_users
           WHERE name IS NOT NULL AND trim(name) <> ''
             AND lower(trim(name)) = $1 LIMIT 1`,
          [nameLower],
        );
        if (taken.rowCount !== 0) {
          throw credentialsSignin('username-taken');
        }

        const usernameIsSomeoneEmail = await pool.query(
          `SELECT 1 FROM auth_users
           WHERE email IS NOT NULL AND trim(email) <> ''
             AND lower(trim(email)) = $1 LIMIT 1`,
          [nameLower],
        );
        if (usernameIsSomeoneEmail.rowCount !== 0) {
          throw credentialsSignin('username-conflicts-email');
        }
      }

      const emailIsSomeoneUsername = await pool.query(
        `SELECT 1 FROM auth_users
         WHERE name IS NOT NULL AND trim(name) <> ''
           AND lower(trim(name)) = $1 LIMIT 1`,
        [emailLower],
      );
      if (emailIsSomeoneUsername.rowCount !== 0) {
        throw credentialsSignin('email-reserved-as-username');
      }

      const newUser = await adapter.createUser({
        emailVerified: null,
        email: emailTrim,
        name: displayName || undefined,
        image:
          typeof image === 'string' && image.length > 0 ? image : undefined,
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
        identifier: emailTrim,
        token,
        expires,
      });
      await sendVerificationEmail({ to: emailTrim, token });
      return newUser;
    } catch (error) {
      if (error instanceof CredentialsSignin) {
        throw error;
      }
      const maybeMessage = String(error?.message ?? '');
      if (
        maybeMessage.includes('Connection terminated unexpectedly') ||
        maybeMessage.includes('SSL/TLS required') ||
        error?.code === 'ECONNRESET' ||
        error?.code === 'ECONNREFUSED'
      ) {
        throw credentialsSignin('service-unavailable');
      }
      if (maybeMessage.includes('password authentication failed')) {
        throw credentialsSignin('db-auth-failed');
      }
      if (
        error?.code === 'MAIL_NOT_CONFIGURED' ||
        error?.code === 'MAIL_PROVIDER_REJECTED' ||
        error?.code === 'MAIL_DELIVERY_FAILED'
      ) {
        throw credentialsSignin('verification-email-failed');
      }
      if (
        error?.code === '23505' &&
        (error?.constraint === 'auth_users_pkey' ||
          error?.constraint === 'auth_accounts_pkey')
      ) {
        throw credentialsSignin('db-sequence-misaligned');
      }
      if (error?.code === '23505') {
        const c = String(error?.constraint ?? '');
        if (c === 'auth_users_email_lower_uidx') {
          throw credentialsSignin('email-already-verified');
        }
        if (c === 'auth_users_name_lower_uidx') {
          throw credentialsSignin('username-taken');
        }
      }
      throw error;
    }
  },
})],
  pages: {
    signIn: '/account/signin',
    signOut: '/account/logout',
  },
})