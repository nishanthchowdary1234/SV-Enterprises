-- 1. Insert missing profiles for existing users
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Fix Carts FK to reference auth.users instead of profiles
ALTER TABLE public.carts
DROP CONSTRAINT IF EXISTS carts_user_id_fkey;

ALTER TABLE public.carts
ADD CONSTRAINT carts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Fix Orders FK to reference auth.users instead of profiles
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 4. Update handle_new_user trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
