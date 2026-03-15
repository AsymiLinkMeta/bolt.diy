/*
  # Create snapshots table

  1. New Tables
    - `snapshots`
      - `chat_id` (text, primary key) - References chats table
      - `user_id` (uuid) - Owner reference for security
      - `snapshot_data` (jsonb) - Contains chatIndex, files, and summary
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `snapshots` table
    - Users can only view and modify snapshots for their own chats
    - Cascade delete when parent chat is deleted

  3. Important Notes
    - Stores file state at specific message points
    - snapshot_data contains: chatIndex (message id), files (FileMap), summary
    - One snapshot per chat (1:1 relationship)
*/

CREATE TABLE IF NOT EXISTS snapshots (
  chat_id text PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view their own chat snapshots
CREATE POLICY "Users can view own snapshots"
  ON snapshots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create snapshots for their own chats
CREATE POLICY "Users can create own snapshots"
  ON snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Users can update their own snapshots
CREATE POLICY "Users can update own snapshots"
  ON snapshots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own snapshots
CREATE POLICY "Users can delete own snapshots"
  ON snapshots
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS snapshots_user_id_idx ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS snapshots_created_at_idx ON snapshots(created_at DESC);

-- Trigger to update updated_at on snapshot modifications
DROP TRIGGER IF EXISTS update_snapshots_updated_at ON snapshots;
CREATE TRIGGER update_snapshots_updated_at
  BEFORE UPDATE ON snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();