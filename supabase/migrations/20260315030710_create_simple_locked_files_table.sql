/*
  # Create locked_files table (simplified)

  1. New Tables
    - `locked_files`
      - `id` (uuid, primary key)
      - `chat_id` (text) - References chat
      - `path` (text) - File or folder path
      - `is_folder` (boolean) - Whether item is a folder
      - `locked_at` (timestamptz) - When lock was created
      - `created_at` (timestamptz)

  2. Constraints
    - Unique constraint on (chat_id, path)
    - Foreign key to chats with cascade delete
*/

CREATE TABLE IF NOT EXISTS locked_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  path text NOT NULL,
  is_folder boolean DEFAULT false,
  locked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes and constraints
CREATE UNIQUE INDEX IF NOT EXISTS locked_files_chat_path_idx ON locked_files(chat_id, path);
CREATE INDEX IF NOT EXISTS locked_files_chat_id_idx ON locked_files(chat_id);
CREATE INDEX IF NOT EXISTS locked_files_locked_at_idx ON locked_files(locked_at DESC);