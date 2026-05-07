# Migration Order

Apply migrations in this order:

1. `db/migrations/001_baseline.sql`
2. `db/migrations/002_tiers.sql`
3. `db/migrations/003_identity.sql`
4. `db/migrations/004_identity_ocr.sql`
5. `db/migrations/005_payment_otp.sql`
6. `db/migrations/006_concurrency_hardening.sql`

Notes:
- `001_baseline.sql` recreates core tables and is intended for local bootstrap.
- `006_concurrency_hardening.sql` is additive and safe to re-run.
