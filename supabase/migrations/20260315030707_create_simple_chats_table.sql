/*
  # Create chats table (simplified for non-auth usage)

  1. New Tables
    - `chats`
      - `id` (text, primary key) - Chat identifier
      - `url_id` (text, unique) - URL-friendly identifier
      - `description` (text) - Chat title/description
      - `messages` (jsonb) - Array of message objects
      - `timestamp` (timestamptz) - Creation/update time
      - `metadata` (jsonb) - Git URL, branch, deployment info
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - RLS disabled for now (will be enabled when auth is added)
    
  3. Indexes
    - Primary key on id
    - Unique index on url_id
    - Index on timestamps for sorting
*/

CREATE TABLE IF NOT EXISTS chats (
  id text PRIMARY KEY,
  url_id text UNIQUE,
  description text DEFAULT '',
  messages jsonb DEFAULT '[]'::jsonb,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS chats_created_at_idx ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS chats_updated_at_idx ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS chats_url_id_idx ON chats(url_id) WHERE url_id IS NOT NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();