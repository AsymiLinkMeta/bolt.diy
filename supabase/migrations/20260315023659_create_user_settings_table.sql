/*
  # Create user_settings table

  1. New Tables
    - `user_settings`
      - `user_id` (uuid, primary key) - References auth.users
      - `latest_branch` (boolean) - Use latest git branch
      - `auto_select_template` (boolean) - Auto-select starter templates
      - `context_optimization` (boolean) - Enable context optimization
      - `event_logs` (boolean) - Enable event logging
      - `prompt_id` (text) - Selected prompt template
      - `developer_mode` (boolean) - Enable developer features
      - `theme` (text) - UI theme preference
      - `tab_configuration` (jsonb) - Tab visibility settings
      - `provider_settings` (jsonb) - LLM provider configurations
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `user_settings` table
    - Users can only view and modify their own settings
    - Settings automatically created on user signup

  3. Important Notes
    - Stores all application settings and preferences
    - Default values provided for all settings
    - Provider settings include API keys and configurations
*/

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latest_branch boolean DEFAULT false,
  auto_select_template boolean DEFAULT true,
  context_optimization boolean DEFAULT true,
  event_logs boolean DEFAULT true,
  prompt_id text DEFAULT 'default',
  developer_mode boolean DEFAULT false,
  theme text DEFAULT 'light',
  tab_configuration jsonb DEFAULT '{}'::jsonb,
  provider_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can create own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to create default settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create settings on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- Trigger to update updated_at on settings modifications
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for theme queries
CREATE INDEX IF NOT EXISTS user_settings_theme_idx ON user_settings(theme);