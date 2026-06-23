-- Database schema for the optional data layer (conversation logs + email leads).
-- Run this once against your Postgres database (e.g. in the Neon SQL editor).
-- Skip this entirely if you don't set DATABASE_URL; the chat works without it.

CREATE TABLE IF NOT EXISTS conversation_logs (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT,
  role        TEXT,
  content     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_leads (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- See your conversation logs:
--   SELECT * FROM conversation_logs ORDER BY created_at DESC;
-- See captured leads:
--   SELECT * FROM email_leads ORDER BY created_at DESC;
