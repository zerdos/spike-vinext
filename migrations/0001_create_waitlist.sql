-- Migration: 0001_create_waitlist.sql
-- Create waitlist table for developer boarding pass submissions

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  client TEXT,
  use_case TEXT,
  github_username TEXT,
  referral_code TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist(position);
