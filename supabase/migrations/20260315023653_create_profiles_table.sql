/*
  # Create profiles table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - References auth.users
      - `username` (text) - User's display name
      - `bio` (text) - User biography
      - `avatar` (text) - Avatar URL or base64 data
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `profiles` table
    - Users can view all profiles
    - Users can only update their own profile
    - Profile is automatically created when user signs up
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  bio text DEFAULT '',
  avatar text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view all profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);