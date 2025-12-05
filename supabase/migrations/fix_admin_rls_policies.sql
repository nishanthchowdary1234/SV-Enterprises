-- Fix Admin Policies: Use Role-Based Access
-- Replaces hardcoded email checks with a proper is_admin() function that checks the profiles table.

-- 1. Create is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update Categories
DROP POLICY IF EXISTS "Admins insert categories" ON categories;
DROP POLICY IF EXISTS "Admins update categories" ON categories;
DROP POLICY IF EXISTS "Admins delete categories" ON categories;

CREATE POLICY "Admins insert categories" ON categories
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins update categories" ON categories
    FOR UPDATE TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins delete categories" ON categories
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 3. Update Products
DROP POLICY IF EXISTS "Admins insert products" ON products;
DROP POLICY IF EXISTS "Admins update products" ON products;
DROP POLICY IF EXISTS "Admins delete products" ON products;

CREATE POLICY "Admins insert products" ON products
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins update products" ON products
    FOR UPDATE TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins delete products" ON products
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 4. Update Product Images
DROP POLICY IF EXISTS "Admins insert product images" ON product_images;
DROP POLICY IF EXISTS "Admins update product images" ON product_images;
DROP POLICY IF EXISTS "Admins delete product images" ON product_images;

CREATE POLICY "Admins insert product images" ON product_images
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins update product images" ON product_images
    FOR UPDATE TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins delete product images" ON product_images
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 5. Update Orders
DROP POLICY IF EXISTS "Users and Admins can view orders" ON orders;
DROP POLICY IF EXISTS "Users and Admins can create orders" ON orders;
DROP POLICY IF EXISTS "Admins update orders" ON orders;
DROP POLICY IF EXISTS "Admins delete orders" ON orders;

CREATE POLICY "Users and Admins can view orders" ON orders
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) = user_id
        OR
        public.is_admin()
    );

CREATE POLICY "Users and Admins can create orders" ON orders
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) = user_id
        OR
        public.is_admin()
    );

CREATE POLICY "Admins update orders" ON orders
    FOR UPDATE TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins delete orders" ON orders
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 6. Update Order Items
DROP POLICY IF EXISTS "Users and Admins can view order items" ON order_items;
DROP POLICY IF EXISTS "Users and Admins can create order items" ON order_items;
DROP POLICY IF EXISTS "Admins update order items" ON order_items;
DROP POLICY IF EXISTS "Admins delete order items" ON order_items;

CREATE POLICY "Users and Admins can view order items" ON order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = (select auth.uid())
        )
        OR
        public.is_admin()
    );

CREATE POLICY "Users and Admins can create order items" ON order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = (select auth.uid())
        )
        OR
        public.is_admin()
    );

CREATE POLICY "Admins update order items" ON order_items
    FOR UPDATE TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins delete order items" ON order_items
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 7. Update Chat Messages
DROP POLICY IF EXISTS "Users and Admins can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Users and Admins can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages (replies)" ON chat_messages;

CREATE POLICY "Users and Admins can view messages" ON chat_messages
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) = user_id
        OR
        public.is_admin()
    );

CREATE POLICY "Users and Admins can insert messages" ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) = user_id
        OR
        public.is_admin()
    );

-- 8. Update Store Settings
DROP POLICY IF EXISTS "Admins insert store settings" ON store_settings;
DROP POLICY IF EXISTS "Admins update store settings" ON store_settings;
DROP POLICY IF EXISTS "Admins delete store settings" ON store_settings;

CREATE POLICY "Admins insert store settings" ON store_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins update store settings" ON store_settings
    FOR UPDATE TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins delete store settings" ON store_settings
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 9. Update Counter Sales
DROP POLICY IF EXISTS "Admins can manage counter sales" ON counter_sales;

CREATE POLICY "Admins can manage counter sales" ON counter_sales
    FOR ALL TO authenticated
    USING (public.is_admin());
