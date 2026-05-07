$ErrorActionPreference = "Stop"

$dbUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
  $dbUrl = "postgresql://app:app@localhost:5432/surveyapp"
}

$files = @(
  "db/migrations/001_baseline.sql",
  "db/migrations/002_tiers.sql",
  "db/migrations/003_identity.sql",
  "db/migrations/004_identity_ocr.sql",
  "db/migrations/005_payment_otp.sql",
  "db/migrations/006_concurrency_hardening.sql",
  "db/migrations/007_free_tier_task_rewards.sql"
)

foreach ($file in $files) {
  Write-Host "Applying $file"
  psql $dbUrl -v ON_ERROR_STOP=1 -f $file
}

Write-Host "All migrations applied."
