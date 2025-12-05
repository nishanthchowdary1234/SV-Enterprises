-- Create a function to allow admins to delete users
-- This deletes from auth.users, which cascades to profiles, orders, etc.

CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if the user executing the function is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can delete users';
  END IF;

  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
