/*
  # Create Profiles Table

  1. New Tables
     - `profiles` (extends auth.users)
       - `id` (uuid, PK, FK to auth.users)
       - `username` (text)
       - `role` (text: 'user'|'admin', default 'user')
       - `avatar_url` (text)
       - `updated_at` (timestamptz)

  2. Security
     - Enable RLS
     - Users can view/update own profile
     - Admins can view all profiles

  3. Triggers
     - Auto-update updated_at
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamptz DEFAULT now(),
  username text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url text
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE
  ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );