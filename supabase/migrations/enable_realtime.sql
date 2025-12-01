-- Enable Realtime for orders and counter_sales tables
-- This is required for the dashboard to update in realtime

begin;
  -- Check if publication exists, if not create it (standard supabase setup usually has it)
  -- We assume 'supabase_realtime' exists as it's default.
  
  -- Add tables to the publication
  alter publication supabase_realtime add table public.orders;
  alter publication supabase_realtime add table public.counter_sales;
commit;
