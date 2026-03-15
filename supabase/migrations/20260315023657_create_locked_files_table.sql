/*
  # Create locked_files table

  1. New Tables
    - `locked_files`
      - `id` (uuid, primary key) - Unique lock identifier
      - `chat_id` (text) - References chat
      - `user_id` (uuid) - Owner reference for security
      - `path` (text) - File or folder path
      - `is_folder` (boolean) - Whether the locked item is a folder
      - `locked_at` (timestamptz) - When the lock was created
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `locked_files` table
    - Users can only manage locks for their own chats
    - Composite unique constraint on (chat_id, path)

  3. Important Notes
    - Prevents concurrent modifications to files
    - Tracks both individual files and entire folders
    - Can be cleaned up periodically (old locks)
*/

CREATE TABLE IF NOT EXISTS locked_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL,
  is_folder boolean DEFAULT false,
  locked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locked_files ENABLE ROW LEVEL SECURITY;

-- Users can view locks for their own chats
CREATE POLICY "Users can view own file locks"
  ON locked_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create locks for their own chats
CREATE POLICY "Users can create own file locks"
  ON locked_files
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

-- Users can delete their own file locks
CREATE POLICY "Users can delete own file locks"
  ON locked_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes and constraints
CREATE UNIQUE INDEX IF NOT EXISTS locked_files_chat_path_idx ON locked_files(chat_id, path);
CREATE INDEX IF NOT EXISTS locked_files_user_id_idx ON locked_files(user_id);
CREATE INDEX IF NOT EXISTS locked_files_chat_id_idx ON locked_files(chat_id);
CREATE INDEX IF NOT EXISTS locked_files_path_idx ON locked_files(path);
CREATE INDEX IF NOT EXISTS locked_files_locked_at_idx ON locked_files(locked_at);

-- Function to clean up old locks (optional, can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_locks(hours_old integer DEFAULT 24)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM locked_files
  WHERE locked_at < now() - (hours_old || ' hours')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;