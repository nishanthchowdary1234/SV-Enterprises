-- Add 'returned' to the check constraint if it exists, or just a comment that the enum needs updating.
-- Since Supabase often uses check constraints for text enums if not using a native enum type.
-- If it's a native enum type:
-- ALTER TYPE "order_status" ADD VALUE 'returned';

-- If it's a check constraint:
-- ALTER TABLE orders DROP CONSTRAINT orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'returned'));

-- For this project, assuming text check constraint or similar.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'returned'));
