/*
  # Create deleted_paths table

  1. New Tables
    - `deleted_paths`
      - `id` (uuid, primary key) - Unique deletion record
      - `chat_id` (text) - References chat
      - `user_id` (uuid) - Owner reference for security
      - `path` (text) - Deleted file or folder path
      - `is_folder` (boolean) - Whether deleted item was a folder
      - `deleted_at` (timestamptz) - When deletion occurred

  2. Security
    - Enable RLS on `deleted_paths` table
    - Users can only view deletions from their own chats
    - Cascade delete when parent chat is deleted

  3. Important Notes
    - Tracks deleted files/folders to prevent reappearing on reload
    - Unique constraint on (chat_id, path) to avoid duplicates
    - Useful for synchronization and conflict resolution
*/

CREATE TABLE IF NOT EXISTS deleted_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL,
  is_folder boolean DEFAULT false,
  deleted_at timestamptz DEFAULT now()
);

ALTER TABLE deleted_paths ENABLE ROW LEVEL SECURITY;

-- Users can view deletions from their own chats
CREATE POLICY "Users can view own deleted paths"
  ON deleted_paths
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create deletion records for their own chats
CREATE POLICY "Users can create own deleted paths"
  ON deleted_paths
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

-- Users can delete their own deletion records (for restoration)
CREATE POLICY "Users can delete own deleted paths"
  ON deleted_paths
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes and constraints
CREATE UNIQUE INDEX IF NOT EXISTS deleted_paths_chat_path_idx ON deleted_paths(chat_id, path);
CREATE INDEX IF NOT EXISTS deleted_paths_chat_id_idx ON deleted_paths(chat_id);
CREATE INDEX IF NOT EXISTS deleted_paths_user_id_idx ON deleted_paths(user_id);
CREATE INDEX IF NOT EXISTS deleted_paths_deleted_at_idx ON deleted_paths(deleted_at DESC);