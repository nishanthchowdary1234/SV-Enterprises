/*
  # Fixed Profiles Table Setup (Matches types.ts)

  1. Table `profiles`
     - `id` uuid PK REFERENCES auth.users ON DELETE CASCADE
     - `updated_at` timestamptz DEFAULT now() NOT NULL
     - `username` text
     - `role` text DEFAULT 'user' CHECK (role IN ('user', 'admin'))
     - `avatar_url` text

  2. Triggers
     - `handle_updated_at()`: Auto-updates timestamp on UPDATE
     - `handle_new_user()`: Auto-creates profile on auth.users INSERT (username from metadata/email prefix, role='user')
     - Triggers: `update_profiles_updated_at` on profiles; `on_auth_user_created` on auth.users

  3. Security
     - RLS enabled
     - Policies (idempotent):
       * Users view/update/insert own profile
       * Admins full CRUD on all profiles

  Notes: Fully idempotent (IF NOT EXISTS checks); distinct dollar quoting prevents nesting errors; safe for re-run.
*/

-- Create/ensure table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  username text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url text
);

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- updated_at trigger function (idempotent)
DO $updated_func_outer$
BEGIN
  IF NOT EXISTS (
    SELECT proname FROM pg_proc 
    WHERE proname = 'handle_updated_at' AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $updated_func_inner$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $updated_func_inner$ LANGUAGE plpgsql;
  END IF;
END $updated_func_outer$;

-- updated_at trigger (recreate idempotent)
DO $updated_trig$
BEGIN
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
END $updated_trig$;

-- new_user function (idempotent)
DO $newuser_func_outer$
BEGIN
  IF NOT EXISTS (
    SELECT proname FROM pg_proc 
    WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $newuser_func_inner$
    BEGIN
      INSERT INTO public.profiles (id, username, avatar_url)
      VALUES (
        NEW.id,
        COALESCE(
          NEW.raw_user_meta_data->>'username',
          split_part(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'avatar_url'
      );
      RETURN NEW;
    END;
    $newuser_func_inner$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END $newuser_func_outer$;

-- auth.users trigger (recreate idempotent)
DO $auth_trig$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END $auth_trig$;

-- Policy: Users view own
DO $pol1$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
END $pol1$;

-- Policy: Users update own
DO $pol2$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;
END $pol2$;

-- Policy: Users insert own
DO $pol3$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
    AND policyname = 'Users can create own profile'
  ) THEN
    CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
END $pol3$;

-- Policy: Admins full access
DO $pol4$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
    AND policyname = 'Admins can manage all profiles'
  ) THEN
    CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
  END IF;
END $pol4$;