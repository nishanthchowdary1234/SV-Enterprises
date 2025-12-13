-- Fix Chat RLS for Read Status
-- Users need permission to update the 'is_read' column for their own chat messages (including those from admin)

CREATE POLICY "Users can update their own chat messages" ON chat_messages
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Also ensure Admins can update (to mark user messages as read)
-- We might already have an admin policy, but let's be safe and explicit or rely on the "Admins manage" if it exists.
-- In 'enhance_chat_features.sql' we added DELETE.
-- Let's add a comprehensive Admin UPDATE policy if it doesn't exist, or just rely on a new one.

CREATE POLICY "Admins can update chat messages" ON chat_messages
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
