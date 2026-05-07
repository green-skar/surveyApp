/**
 * Seed first row in app_admins if table is empty.
 * Run from apps/web: node --env-file=.env scripts/seed-admin.mjs
 * (Node 20+) or set DATABASE_URL, ADMIN_BOOTSTRAP_USERNAME, ADMIN_BOOTSTRAP_PASSWORD.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { hash } from 'argon2';

const cwd = process.cwd();
const envPath = join(cwd, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const rawUrl = String(process.env.DATABASE_URL ?? '').trim();
const user = process.env.ADMIN_BOOTSTRAP_USERNAME?.trim();
const pass = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

if (!rawUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
if (!user || !pass) {
  console.error('Set ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD in apps/web/.env');
  process.exit(1);
}

const url = rawUrl.replace(/@localhost(?=[:/?#]|$)/gi, '@127.0.0.1');
const pool = new pg.Pool({ connectionString: url });

try {
  const { rows } = await pool.query('SELECT id FROM app_admins LIMIT 1');
  if (rows.length > 0) {
    console.log('app_admins already has a row; skipping seed.');
    process.exit(0);
  }
  const password_hash = await hash(pass);
  await pool.query(
    `INSERT INTO app_admins (username, password_hash, must_change_password)
     VALUES ($1, $2, true)`,
    [user, password_hash],
  );
  console.log(`Seeded admin username: ${user} (change password at /admin/first-login).`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await pool.end();
}
