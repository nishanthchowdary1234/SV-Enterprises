-- Add foreign key from orders.user_id to profiles.id to enable joins
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
