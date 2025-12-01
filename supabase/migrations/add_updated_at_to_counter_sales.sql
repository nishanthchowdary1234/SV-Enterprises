-- Add updated_at column to counter_sales table
ALTER TABLE public.counter_sales 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
