-- 1. Fix Mutable Search Paths
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.get_trending_products(int) SET search_path = public;
ALTER FUNCTION public.get_daily_revenue() SET search_path = public;
-- Attempt to fix handle_updated_at if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        ALTER FUNCTION public.handle_updated_at() SET search_path = public;
    END IF;
END $$;

-- 2. Optimize RLS Policies (Wrap auth calls & Consolidate)

-- PROFILES
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);

-- CARTS
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
CREATE POLICY "Users can view their own cart" ON public.carts FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own cart" ON public.carts;
CREATE POLICY "Users can create their own cart" ON public.carts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
CREATE POLICY "Users can update their own cart" ON public.carts FOR UPDATE USING ((select auth.uid()) = user_id);

-- CART ITEMS
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
CREATE POLICY "Users can view their own cart items" ON public.cart_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_items.cart_id AND user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert into their own cart" ON public.cart_items;
CREATE POLICY "Users can insert into their own cart" ON public.cart_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_items.cart_id AND user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
CREATE POLICY "Users can update their own cart items" ON public.cart_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_items.cart_id AND user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
CREATE POLICY "Users can delete their own cart items" ON public.cart_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_items.cart_id AND user_id = (select auth.uid()))
);

-- ORDERS
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Consolidate SELECT policies for Orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Users and Admins can view orders" ON public.orders FOR SELECT USING (
    ((select auth.uid()) = user_id) OR (select public.is_admin())
);

-- ORDER ITEMS
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Users can insert their own order items" ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = (select auth.uid()))
);

-- Consolidate SELECT policies for Order Items
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Users and Admins can view order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = (select auth.uid()))
    OR (select public.is_admin())
);

-- PRODUCT IMAGES
-- Split Admin "ALL" policy to avoid redundancy with "Public View" SELECT policy
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;

CREATE POLICY "Admins can insert product images" ON public.product_images FOR INSERT WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admins can update product images" ON public.product_images FOR UPDATE USING ((select public.is_admin()));
CREATE POLICY "Admins can delete product images" ON public.product_images FOR DELETE USING ((select public.is_admin()));
-- "Product images are viewable by everyone" handles SELECT for everyone (including admins)
