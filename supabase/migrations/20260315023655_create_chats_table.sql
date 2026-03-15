/*
  # Create chats table

  1. New Tables
    - `chats`
      - `id` (text, primary key) - Unique chat identifier
      - `user_id` (uuid, foreign key) - Owner of the chat
      - `url_id` (text, unique) - User-friendly URL identifier
      - `description` (text) - Chat title/description
      - `messages` (jsonb) - Array of message objects
      - `metadata` (jsonb) - Git URL, branch, deployment info
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `chats` table
    - Users can only view and modify their own chats
    - Users can create new chats
    - Users can delete their own chats

  3. Important Notes
    - Messages stored as JSONB for flexibility
    - Metadata includes git information and deployment details
    - Indexed on user_id and timestamps for efficient queries
*/

CREATE TABLE IF NOT EXISTS chats (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url_id text UNIQUE,
  description text,
  messages jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Users can view their own chats
CREATE POLICY "Users can view own chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own chats
CREATE POLICY "Users can create own chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own chats
CREATE POLICY "Users can update own chats"
  ON chats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own chats
CREATE POLICY "Users can delete own chats"
  ON chats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(user_id);
CREATE INDEX IF NOT EXISTS chats_created_at_idx ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS chats_updated_at_idx ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS chats_url_id_idx ON chats(url_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on chat modifications
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();