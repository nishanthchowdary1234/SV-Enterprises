-- Add RLS policies for Admins to access chat messages

-- Allow admins to view ALL messages
CREATE POLICY "Admins can view all messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Allow admins to insert messages (replies)
CREATE POLICY "Admins can insert messages (replies)" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
