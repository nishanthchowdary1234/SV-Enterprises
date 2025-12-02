-- 1. Create store_settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'My Store',
  support_email text,
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policies for store_settings
CREATE POLICY "Public read store settings" ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage store settings" ON public.store_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert default settings if not exists
INSERT INTO public.store_settings (store_name, currency)
SELECT 'My Store', 'INR'
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);

-- 2. Fix profiles role constraint to allow 'customer'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('customer', 'admin', 'user'));

-- Change default role to 'customer'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer';

-- Migrate existing 'user' roles to 'customer'
UPDATE public.profiles SET role = 'customer' WHERE role = 'user';
