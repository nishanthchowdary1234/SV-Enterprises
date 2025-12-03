-- 1. Ensure reviews table exists
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add Foreign Key to profiles to allow joining
-- This allows: .select('*, user:profiles(full_name)')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE reviews
        ADD CONSTRAINT reviews_user_id_profiles_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 4. Fix Reviews Policies
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
CREATE POLICY "Users can insert their own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- 5. Ensure Profiles are viewable by everyone (so we can see the reviewer's name)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
