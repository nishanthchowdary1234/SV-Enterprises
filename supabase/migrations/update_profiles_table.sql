-- Add updated_at and address fields to profiles table
alter table public.profiles 
add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
add column if not exists address text,
add column if not exists city text,
add column if not exists state text,
add column if not exists zip text,
add column if not exists country text;
