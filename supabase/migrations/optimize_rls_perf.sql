-- Optimize RLS Policies: Performance & Consolidation
-- 1. Wraps auth.uid() and other auth functions in (select ...) to prevent per-row re-evaluation.
-- 2. Consolidates redundant policies to resolve "Multiple Permissive Policies" warnings.
-- 3. Splits "Admins manage" (ALL) policies into INSERT/UPDATE/DELETE where Public SELECT exists.

-- 1. PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = id);

-- 2. CATEGORIES
DROP POLICY IF EXISTS "Admins manage categories" ON categories;

CREATE POLICY "Admins insert categories" ON categories
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins update categories" ON categories
    FOR UPDATE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins delete categories" ON categories
    FOR DELETE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

-- 3. PRODUCTS
DROP POLICY IF EXISTS "Admins manage products" ON products;

CREATE POLICY "Admins insert products" ON products
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins update products" ON products
    FOR UPDATE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins delete products" ON products
    FOR DELETE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

-- 4. PRODUCT IMAGES
DROP POLICY IF EXISTS "Admins manage product images" ON product_images;

CREATE POLICY "Admins insert product images" ON product_images
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins update product images" ON product_images
    FOR UPDATE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins delete product images" ON product_images
    FOR DELETE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

-- 5. ORDERS
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Admins manage orders" ON orders;

CREATE POLICY "Users and Admins can view orders" ON orders
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) = user_id
        OR
        ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com')
    );

CREATE POLICY "Users and Admins can create orders" ON orders
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) = user_id
        OR
        ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com')
    );

CREATE POLICY "Admins update orders" ON orders
    FOR UPDATE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins delete orders" ON orders
    FOR DELETE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

-- 6. ORDER ITEMS
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON order_items;
DROP POLICY IF EXISTS "Admins manage order items" ON order_items;

CREATE POLICY "Users and Admins can view order items" ON order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = (select auth.uid())
        )
        OR
        ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com')
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
        ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com')
    );

CREATE POLICY "Admins update order items" ON order_items
    FOR UPDATE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins delete order items" ON order_items
    FOR DELETE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

-- 7. CHAT MESSAGES
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages (replies)" ON chat_messages;

CREATE POLICY "Users and Admins can view messages" ON chat_messages
    FOR SELECT TO authenticated
    USING (
        (select auth.uid()) = user_id
        OR
        ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com')
    );

CREATE POLICY "Users and Admins can insert messages" ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        (select auth.uid()) = user_id
        OR
        ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com')
    );

-- 8. REVIEWS
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;

CREATE POLICY "Public can view reviews" ON reviews
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Users can insert own reviews" ON reviews
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

-- 9. STORE SETTINGS
DROP POLICY IF EXISTS "Admins manage store settings" ON store_settings;
DROP POLICY IF EXISTS "Public read store settings" ON store_settings;

CREATE POLICY "Public can view store settings" ON store_settings
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Admins insert store settings" ON store_settings
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins update store settings" ON store_settings
    FOR UPDATE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

CREATE POLICY "Admins delete store settings" ON store_settings
    FOR DELETE TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

-- 10. CARTS (Optimization only)
DROP POLICY IF EXISTS "Users can view own cart" ON carts;
CREATE POLICY "Users can view own cart" ON carts
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own cart" ON carts;
CREATE POLICY "Users can create own cart" ON carts
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own cart" ON carts;
CREATE POLICY "Users can update own cart" ON carts
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own cart" ON carts;
CREATE POLICY "Users can delete own cart" ON carts
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- 11. CART ITEMS (Optimization only)
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items" ON cart_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items" ON cart_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items" ON cart_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items" ON cart_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = (select auth.uid())
        )
    );

-- 12. COUNTER SALES (Optimization)
DROP POLICY IF EXISTS "Admins can manage counter sales" ON counter_sales;
CREATE POLICY "Admins can manage counter sales" ON counter_sales
    FOR ALL TO authenticated
    USING ((select auth.jwt() ->> 'email') = 'admin@sventerprises.com');

-- 13. ADDRESSES (Optimization)
DROP POLICY IF EXISTS "Users can manage own addresses" ON addresses;
CREATE POLICY "Users can manage own addresses" ON addresses
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id);
