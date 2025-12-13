-- Chat Enhancements Migration
-- 1. Add is_read column to track unread messages
-- 2. Enable DELETE RLS policy for Admins

-- 1. Add is_read column
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 2. Add DELETE Policy for Admins
-- We need to ensure the policy allows admins to delete ANY message.
-- We previously consolidated policies, so let's check if we need to add a specific DELETE one or if "Admins manage" covers it.
-- In 'optimize_rls_perf.sql', we didn't explicitly add a DELETE policy for chat_messages, only SELECT and INSERT.

DROP POLICY IF EXISTS "Admins can delete messages" ON chat_messages;

CREATE POLICY "Admins can delete messages" ON chat_messages
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 3. Index for performance on is_read
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON public.chat_messages(is_read);
