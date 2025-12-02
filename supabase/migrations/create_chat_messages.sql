-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can insert their own messages
CREATE POLICY "Users can insert their own messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own messages
CREATE POLICY "Users can view their own messages" ON chat_messages
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all messages (assuming admin check via profile or claim)
-- For simplicity, we'll use a simple check or just allow all authenticated users to insert (but only see their own).
-- To allow admins to see ALL, we need a way to identify admins in RLS.
-- Often we use a function or a claim.
-- For now, let's allow users to see their own, and we'll add a policy for admins if we have a way.
-- Assuming we have a profiles table with role = 'admin'.

CREATE POLICY "Admins can view all messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert messages (replies)" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
