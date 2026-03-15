/*
  # Create snapshots table (simplified)

  1. New Tables
    - `snapshots`
      - `chat_id` (text, primary key) - References chat
      - `snapshot` (jsonb) - Contains chatIndex, files, and summary
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Relationships
    - Foreign key to chats with cascade delete
*/

CREATE TABLE IF NOT EXISTS snapshots (
  chat_id text PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_snapshots_updated_at
  BEFORE UPDATE ON snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();