/*
  # Create Categories Table

  1. New Tables
     - `categories`
       - `id` (uuid, PK, default gen_random_uuid())
       - `name` (text, NOT NULL)
       - `description` (text, nullable)
       - `created_at` (timestamptz, default now())

  2. Indexes
     - Primary key index (auto)

  3. Security
     - Enable RLS
     - Public: SELECT (browse categories)
     - Authenticated admins: INSERT/UPDATE/DELETE/SELECT all

  Notes: Idempotent (IF NOT EXISTS, DO blocks); safe defaults; matches types.ts.
*/

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;

-- Public read
DO $pol1$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'categories' 
    AND policyname = 'Public can view categories'
  ) THEN
    CREATE POLICY "Public can view categories" ON public.categories
    FOR SELECT TO public USING (true);
  END IF;
END $pol1$;

-- Admins full access
DO $pol2$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'categories' 
    AND policyname = 'Admins manage categories'
  ) THEN
    CREATE POLICY "Admins manage categories" ON public.categories
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $pol2$;