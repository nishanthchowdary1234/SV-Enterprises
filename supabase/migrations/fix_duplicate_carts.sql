-- 1. Delete items belonging to duplicate carts
-- We identify duplicate carts by partitioning by user_id and ordering by created_at DESC.
-- We keep the most recent cart (rn = 1) and delete the rest (rn > 1).

WITH carts_to_delete AS (
  SELECT id
  FROM (
    SELECT id, user_id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM carts
    WHERE user_id IS NOT NULL
  ) t
  WHERE rn > 1
)
DELETE FROM cart_items
WHERE cart_id IN (SELECT id FROM carts_to_delete);

-- 2. Delete the duplicate carts themselves
WITH carts_to_delete AS (
  SELECT id
  FROM (
    SELECT id, user_id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM carts
    WHERE user_id IS NOT NULL
  ) t
  WHERE rn > 1
)
DELETE FROM carts
WHERE id IN (SELECT id FROM carts_to_delete);

-- 3. Add a unique constraint to prevent this from happening again
-- We use a DO block to check if the constraint exists before adding it, to make the script idempotent.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'carts_user_id_key'
    ) THEN
        ALTER TABLE carts
        ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);
    END IF;
END $$;
