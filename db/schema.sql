-- HouseSmart.ca — PostgreSQL schema for auth, bookmarks, and lead capture.
-- Idempotent: safe to run repeatedly (npm run db:init).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,                          -- NULL for magic-link-only accounts
  email_digest   TEXT NOT NULL DEFAULT 'none'   -- 'none' | 'daily' | 'weekly'
                 CHECK (email_digest IN ('none', 'daily', 'weekly')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,                 -- sha256 of the cookie token
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS magic_links (
  token_hash  TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jtbd_id     TEXT NOT NULL,                    -- WordPress post ID (stringified) or slug
  jtbd_slug   TEXT NOT NULL,
  jtbd_title  TEXT NOT NULL,
  matrix_node TEXT,                             -- e.g. "How / Direct / All" for dashboard filtering
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, jtbd_id)
);
CREATE INDEX IF NOT EXISTS bookmarks_saved_idx ON bookmarks (user_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  project     TEXT,                             -- what they're building/fixing
  message     TEXT,
  jtbd_slug   TEXT,                             -- which innovation page generated the lead
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
