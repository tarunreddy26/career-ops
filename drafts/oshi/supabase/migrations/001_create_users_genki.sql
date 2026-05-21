-- Genki Meter — Users table with genki fields
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Creates a users table with the three genki fields from the brief:
--   genki_value (0–100, default 80)
--   last_active_at (UTC timestamp)
--   last_checkin_at (UTC timestamp)

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- A simple user identifier (can be device ID, auth ID, etc.)
  -- Using text for flexibility — can be swapped to auth.uid() later
  user_id TEXT UNIQUE NOT NULL,

  -- Genki meter fields
  genki_value INTEGER NOT NULL DEFAULT 80
    CHECK (genki_value >= 0 AND genki_value <= 100),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checkin_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z',

  -- Standard timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Auto-update the updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS policies — allow our backend (anon key) to read/write users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations via anon key (server-side only)
-- In production, tighten this to service_role or add auth checks
CREATE POLICY "Allow all for anon" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);
