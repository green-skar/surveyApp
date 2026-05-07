# Local development (Postgres + web + mobile)

## 1) Start local Postgres (Docker)

From the repo root:

```bash
docker compose --env-file .env.db.local.example up -d
```

Services:

- Postgres: `localhost:5432`
- PgBouncer (transaction pool): `localhost:6432`
- Adminer (optional UI): `http://localhost:8080`

## 2) Apply database migrations

Install PostgreSQL client tools (`psql`) on your machine, then from repo root:

**Windows (PowerShell):**

```powershell
$env:DATABASE_URL="postgresql://app:app@localhost:5432/surveyapp"
pwsh ./db/scripts/migrate.ps1
```

**macOS/Linux:**

```bash
export DATABASE_URL="postgresql://app:app@localhost:5432/surveyapp"
bash ./db/scripts/migrate.sh
```

To use PgBouncer instead (recommended when simulating many clients):

```text
postgresql://app:app@localhost:6432/surveyapp
```

## 3) Configure `apps/web`

Copy `apps/web/.env.example` to `apps/web/.env` and set at least:

- `DATABASE_URL` (from step 2)
- `AUTH_SECRET` (long random string)
- `AUTH_URL` (the URL you open in the browser for the web app, e.g. `http://localhost:5173`)

### Email (Gmail + Nodemailer)

Outbound mail uses [`apps/web/src/lib/mail/sendAppEmail.js`](apps/web/src/lib/mail/sendAppEmail.js) in this order: **Gmail SMTP** (`GMAIL_USER` + `GMAIL_APP_PASSWORD`), then **generic SMTP** (`SMTP_HOST`, etc.), then **Resend** (`RESEND_API_KEY`), then console-only dev logging.

**Gmail setup:**

1. Turn on **2-Step Verification** for the Google account.
2. Create an **App password**: Google Account → Security → App passwords → choose “Mail” (or Other).
3. In `apps/web/.env` set:
   - `GMAIL_USER=youraddress@gmail.com`
   - `GMAIL_APP_PASSWORD=` the 16-character app password (spaces optional)
   - `EMAIL_FROM="SurveyTasker <youraddress@gmail.com>"` (must match the account or a verified “Send mail as” alias)

Personal Gmail has daily sending limits; for higher volume or deliverability use **Google Workspace** or a transactional provider later.

Restart the dev server after changing mail env vars.

## 4) Run the web app

```bash
cd apps/web
npm install --legacy-peer-deps
npm run dev
```

Open **`http://localhost:4000`** (Vite dev port in `apps/web/vite.config.ts`).

### Sign up → verify → sign in

1. Go to **`/account/signup`**, create an account (email, password, username).
2. Open the verification link from email, or copy it from the **server console** if mail is not configured.
3. Go to **`/account/signin`** and sign in with the same email and password (sign-in requires a verified email).

## Quick verification checklist

- Web loads and `/api/auth/session` responds (after sign-in).
- Complete a task once: balance increases; repeating the same task does not double-pay.
- Request + verify payout-method OTP (invalid code rejected; no duplicate defaults after concurrency).
- Mobile: sign-in WebView completes and API calls hit your LAN `EXPO_PUBLIC_BASE_URL`.

## 5) Configure `apps/mobile` for local API

Copy `apps/mobile/.env.development.example` to `apps/mobile/.env` and replace the example IP with your machine LAN IP (must be reachable from the phone/emulator).

Then start Expo from `apps/mobile` using your normal workflow.

## Notes

- Canonical SQL migrations live in `db/migrations` (see `db/docs/migration-order.md`).
- Root-level `db.sql` / `db-*-migration.sql` files are legacy pointers; prefer `db/migrations` for new environments.
