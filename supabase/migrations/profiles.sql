/*
  # Profiles Table Setup

  1. New Tables
     - `profiles` (linked to auth.users)
       - `id` (uuid, primary key, references auth.users ON DELETE CASCADE)
       - `full_name` (text)
       - `avatar_url` (text)
       - `updated_at` (timestamptz, default now())

  2. Triggers
     - `handle_new_user()`: Auto-creates profile on new auth.user
     - `on_auth_user_created`: Trigger on auth.users INSERT

  3. Security
     - Enable RLS on profiles
     - Policies:
       - Public SELECT (view all profiles)
       - Authenticated INSERT/UPDATE own profile (auth.uid() = id)

  Notes: Safe idempotent operations using IF NOT EXISTS and DO blocks.
*/

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public read policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone.'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);
  END IF;
END $$;

-- Insert own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile.'
  ) THEN
    CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Update own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile.'
  ) THEN
    CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Function for auto profile creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT proname FROM pg_proc WHERE proname = 'handle_new_user'
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, avatar_url)
      VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END $$;

-- Trigger on auth.users
DO $$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
END $$;