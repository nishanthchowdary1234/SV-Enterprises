-- 1. Add Check Constraint to prevent negative stock
ALTER TABLE public.products 
ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);

-- 2. Create Function to Decrement Stock (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.decrement_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on order_items
DROP TRIGGER IF EXISTS on_order_item_created ON public.order_items;
CREATE TRIGGER on_order_item_created
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.decrement_stock();
