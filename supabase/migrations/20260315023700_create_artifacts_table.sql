/*
  # Create artifacts table

  1. New Tables
    - `artifacts`
      - `id` (uuid, primary key) - Unique artifact identifier
      - `chat_id` (text) - References chat
      - `user_id` (uuid) - Owner reference for security
      - `title` (text) - Artifact title/name
      - `artifact_type` (text) - Type: 'bundled', 'code', etc.
      - `content` (text) - File/artifact content
      - `file_path` (text) - Optional file path
      - `is_binary` (boolean) - Whether content is binary
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `artifacts` table
    - Users can only view and modify artifacts from their own chats
    - Cascade delete when parent chat is deleted

  3. Important Notes
    - Stores generated files and artifacts from chat interactions
    - Supports both text and binary content
    - Multiple artifacts can belong to one chat
*/

CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artifact_type text DEFAULT 'code',
  content text,
  file_path text,
  is_binary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Users can view artifacts from their own chats
CREATE POLICY "Users can view own artifacts"
  ON artifacts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create artifacts for their own chats
CREATE POLICY "Users can create own artifacts"
  ON artifacts
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

-- Users can update their own artifacts
CREATE POLICY "Users can update own artifacts"
  ON artifacts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own artifacts
CREATE POLICY "Users can delete own artifacts"
  ON artifacts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS artifacts_chat_id_idx ON artifacts(chat_id);
CREATE INDEX IF NOT EXISTS artifacts_user_id_idx ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS artifacts_chat_id_id_idx ON artifacts(chat_id, id);
CREATE INDEX IF NOT EXISTS artifacts_created_at_idx ON artifacts(created_at DESC);
CREATE INDEX IF NOT EXISTS artifacts_type_idx ON artifacts(artifact_type);

-- Trigger to update updated_at on artifact modifications
DROP TRIGGER IF EXISTS update_artifacts_updated_at ON artifacts;
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();