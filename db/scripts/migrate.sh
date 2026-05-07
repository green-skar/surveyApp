#!/usr/bin/env sh
set -eu

DB_URL="${DATABASE_URL:-postgresql://app:app@localhost:5432/surveyapp}"

for file in \
  db/migrations/001_baseline.sql \
  db/migrations/002_tiers.sql \
  db/migrations/003_identity.sql \
  db/migrations/004_identity_ocr.sql \
  db/migrations/005_payment_otp.sql \
  db/migrations/006_concurrency_hardening.sql \
  db/migrations/007_free_tier_task_rewards.sql
do
  echo "Applying ${file}"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "All migrations applied."
