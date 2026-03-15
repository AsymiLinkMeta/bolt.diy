/*
  # Create file_modifications table

  1. New Tables
    - `file_modifications`
      - `id` (uuid, primary key) - Unique modification record
      - `chat_id` (text) - References chat
      - `user_id` (uuid) - Owner reference for security
      - `file_path` (text) - Path of modified file
      - `original_content` (text) - Content before modification
      - `modified_content` (text) - Content after modification
      - `modification_type` (text) - Type: 'create', 'update', 'delete'
      - `modified_at` (timestamptz) - When modification occurred

  2. Security
    - Enable RLS on `file_modifications` table
    - Users can only view modifications from their own chats
    - Cascade delete when parent chat is deleted

  3. Important Notes
    - Tracks all file changes during a chat session
    - Useful for history and rollback functionality
    - Stores both original and modified content for diff viewing
*/

CREATE TABLE IF NOT EXISTS file_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  original_content text,
  modified_content text,
  modification_type text DEFAULT 'update',
  modified_at timestamptz DEFAULT now()
);

ALTER TABLE file_modifications ENABLE ROW LEVEL SECURITY;

-- Users can view modifications from their own chats
CREATE POLICY "Users can view own file modifications"
  ON file_modifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create modification records for their own chats
CREATE POLICY "Users can create own file modifications"
  ON file_modifications
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

-- Users can delete their own modification records
CREATE POLICY "Users can delete own file modifications"
  ON file_modifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS file_modifications_chat_id_idx ON file_modifications(chat_id);
CREATE INDEX IF NOT EXISTS file_modifications_user_id_idx ON file_modifications(user_id);
CREATE INDEX IF NOT EXISTS file_modifications_chat_path_idx ON file_modifications(chat_id, file_path);
CREATE INDEX IF NOT EXISTS file_modifications_modified_at_idx ON file_modifications(modified_at DESC);
CREATE INDEX IF NOT EXISTS file_modifications_type_idx ON file_modifications(modification_type);