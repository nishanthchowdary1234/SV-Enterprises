-- Ensure reviews table exists (if not already)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplication
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

-- Create Policies

-- 1. Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (true);

-- 2. Authenticated users can insert reviews
CREATE POLICY "Users can insert their own reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = user_id);
