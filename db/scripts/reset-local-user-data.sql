-- Dev/local only: remove credential users, sessions, verification tokens, and app rows keyed by profile user_id.
-- Does NOT remove jobs/tasks seed data.
-- Run against your dev DB, e.g.:
--   docker compose exec -T postgres psql -U app -d surveyapp -v ON_ERROR_STOP=1 -f /path/...
-- Or pipe file contents into psql from the host.

BEGIN;

DELETE FROM payment_method_otp_challenges;
DELETE FROM payment_methods;
DELETE FROM payouts;
DELETE FROM tier_unlocks;
DELETE FROM user_balances;
DELETE FROM user_tasks;
DELETE FROM profiles;

DELETE FROM auth_accounts;
DELETE FROM auth_sessions;
DELETE FROM auth_verification_token;
DELETE FROM auth_users;

-- Reset serials so the next user is predictable in dev (optional)
ALTER SEQUENCE auth_users_id_seq RESTART WITH 1;
ALTER SEQUENCE auth_accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE auth_sessions_id_seq RESTART WITH 1;

COMMIT;
