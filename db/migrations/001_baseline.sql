-- Baseline schema and seed data.
-- NOTE: This script contains DROP TABLE statements and is for local/dev bootstrap.

CREATE SEQUENCE IF NOT EXISTS jobs_id_seq;
CREATE SEQUENCE IF NOT EXISTS tasks_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_tasks_id_seq;
CREATE SEQUENCE IF NOT EXISTS payouts_id_seq;
CREATE SEQUENCE IF NOT EXISTS payment_methods_id_seq;
CREATE SEQUENCE IF NOT EXISTS auth_users_id_seq;
CREATE SEQUENCE IF NOT EXISTS auth_accounts_id_seq;
CREATE SEQUENCE IF NOT EXISTS auth_sessions_id_seq;

DROP TABLE IF EXISTS "public"."profiles";
CREATE TABLE "public"."profiles" (
    "user_id" text NOT NULL,
    "full_name" text,
    "country" text,
    "interests" _text,
    "payment_preference" text,
    "balance" numeric(10,2) DEFAULT 0.00,
    "is_premium" bool DEFAULT false,
    "onboarded" bool DEFAULT false,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("user_id")
);

DROP TABLE IF EXISTS "public"."jobs";
CREATE TABLE "public"."jobs" (
    "id" int4 NOT NULL DEFAULT nextval('jobs_id_seq'::regclass),
    "title" text NOT NULL,
    "description" text,
    "category" text,
    "is_premium" bool DEFAULT false,
    "unlock_fee" numeric(10,2) DEFAULT 0.00,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tasks";
CREATE TABLE "public"."tasks" (
    "id" int4 NOT NULL DEFAULT nextval('tasks_id_seq'::regclass),
    "job_id" int4,
    "title" text NOT NULL,
    "description" text,
    "reward" numeric(10,2) NOT NULL,
    "time_limit_minutes" int4 DEFAULT 10,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tasks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id"),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."user_tasks";
CREATE TABLE "public"."user_tasks" (
    "id" int4 NOT NULL DEFAULT nextval('user_tasks_id_seq'::regclass),
    "user_id" text NOT NULL,
    "task_id" int4,
    "status" text DEFAULT 'pending'::text,
    "reward_earned" numeric(10,2) DEFAULT 0.00,
    "started_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "completed_at" timestamptz,
    CONSTRAINT "user_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id"),
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX user_tasks_user_id_task_id_key ON public.user_tasks USING btree (user_id, task_id);

DROP TABLE IF EXISTS "public"."payouts";
CREATE TABLE "public"."payouts" (
    "id" int4 NOT NULL DEFAULT nextval('payouts_id_seq'::regclass),
    "user_id" text NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" text DEFAULT 'pending'::text,
    "payment_method_id" int4,
    "requested_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "processed_at" timestamptz,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."payment_methods";
CREATE TABLE "public"."payment_methods" (
    "id" int4 NOT NULL DEFAULT nextval('payment_methods_id_seq'::regclass),
    "user_id" text NOT NULL,
    "type" text NOT NULL,
    "details" jsonb NOT NULL,
    "is_default" bool DEFAULT false,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."auth_verification_token";
CREATE TABLE "public"."auth_verification_token" (
    "identifier" text NOT NULL,
    "expires" timestamptz NOT NULL,
    "token" text NOT NULL,
    PRIMARY KEY ("identifier","token")
);

DROP TABLE IF EXISTS "public"."auth_users";
CREATE TABLE "public"."auth_users" (
    "id" int4 NOT NULL DEFAULT nextval('auth_users_id_seq'::regclass),
    "name" varchar(255),
    "email" varchar(255),
    "emailVerified" timestamptz,
    "image" text,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."auth_accounts";
CREATE TABLE "public"."auth_accounts" (
    "id" int4 NOT NULL DEFAULT nextval('auth_accounts_id_seq'::regclass),
    "userId" int4 NOT NULL,
    "type" varchar(255) NOT NULL,
    "provider" varchar(255) NOT NULL,
    "providerAccountId" varchar(255) NOT NULL,
    "refresh_token" text,
    "access_token" text,
    "expires_at" int8,
    "id_token" text,
    "scope" text,
    "session_state" text,
    "token_type" text,
    "password" text,
    CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE CASCADE,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."auth_sessions";
CREATE TABLE "public"."auth_sessions" (
    "id" int4 NOT NULL DEFAULT nextval('auth_sessions_id_seq'::regclass),
    "userId" int4 NOT NULL,
    "expires" timestamptz NOT NULL,
    "sessionToken" varchar(255) NOT NULL,
    CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE CASCADE,
    PRIMARY KEY ("id")
);

INSERT INTO "public"."profiles" ("user_id", "full_name", "country", "interests", "payment_preference", "balance", "is_premium", "onboarded", "created_at") VALUES
('1', 'john doe', 'kenya', '{Technology,Lifestyle,Education}', 'bank transfer', 0.00, 'f', 't', '2026-04-24 18:38:39.286403+00');
INSERT INTO "public"."jobs" ("id", "title", "description", "category", "is_premium", "unlock_fee", "created_at") VALUES
(1, 'Consumer Electronics Survey', 'Help us understand your tech habits.', 'Market Research', 'f', 0.00, '2026-04-24 18:30:12.843817+00'),
(2, 'Local Transit Feedback', 'Feedback on public transportation in your area.', 'Community', 'f', 0.00, '2026-04-24 18:30:12.843817+00'),
(3, 'Premium Finance Survey', 'Unlock high-paying finance tasks.', 'Finance', 't', 5.00, '2026-04-24 18:30:12.843817+00'),
(4, 'AI Model Training', 'Label images for our premium AI engine.', 'Tech', 't', 10.00, '2026-04-24 18:30:12.843817+00');
INSERT INTO "public"."tasks" ("id", "job_id", "title", "description", "reward", "time_limit_minutes", "created_at") VALUES
(1, 1, 'Part 1: Smartphone Usage', NULL, 4.00, 5, '2026-04-24 18:30:12.843817+00'),
(2, 1, 'Part 2: Laptop Preferences', NULL, 4.50, 8, '2026-04-24 18:30:12.843817+00'),
(3, 2, 'Daily Commute Patterns', NULL, 5.00, 10, '2026-04-24 18:30:12.843817+00'),
(4, 3, 'Credit Card Sentiment', NULL, 5.00, 15, '2026-04-24 18:30:12.843817+00'),
(5, 3, 'Investment Strategy Review', NULL, 7.50, 20, '2026-04-24 18:30:12.843817+00'),
(6, 4, 'Object Detection: Street Scenes', NULL, 12.00, 30, '2026-04-24 18:30:12.843817+00');

INSERT INTO "public"."auth_users" ("id", "name", "email", "emailVerified", "image") VALUES
(1, 'john doe', 'scarvin460@gmail.com', NULL, NULL);
INSERT INTO "public"."auth_accounts" ("id", "userId", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "id_token", "scope", "session_state", "token_type", "password") VALUES
(1, 1, 'credentials', 'credentials', '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$/D3hLeF32KGHbYH1iLas4w$PLlIKhClyRVndV0x++INv0XXQDZ7Adu8p8IhIFnjPag');
