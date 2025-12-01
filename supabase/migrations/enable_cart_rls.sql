-- Enable RLS on carts
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own cart
CREATE POLICY "Users can view own cart"
ON public.carts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can create their own cart
CREATE POLICY "Users can create own cart"
ON public.carts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items in their own cart
CREATE POLICY "Users can view own cart items"
ON public.cart_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  )
);

-- Policy: Users can insert items into their own cart
CREATE POLICY "Users can insert own cart items"
ON public.cart_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  )
);

-- Policy: Users can update items in their own cart
CREATE POLICY "Users can update own cart items"
ON public.cart_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  )
);

-- Policy: Users can delete items from their own cart
CREATE POLICY "Users can delete own cart items"
ON public.cart_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
  )
);
