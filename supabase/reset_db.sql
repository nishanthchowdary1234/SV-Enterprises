-- DANGER: This script drops all tables and data!
-- Run this in the Supabase SQL Editor to reset your database.

-- 1. Drop existing tables and functions to start fresh
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.get_trending_products(int) cascade;
drop function if exists public.get_daily_revenue() cascade;

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.cart_items cascade;
drop table if exists public.carts cascade;
drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.store_settings cascade;
drop table if exists public.counter_sales cascade;

-- 2. Create Helper Function for Admin Check (Prevents Infinite Recursion)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Create Tables

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text, -- Added email field for easy access
  full_name text,
  avatar_url text,
  role text default 'customer' check (role in ('customer', 'admin')),
  address text,
  city text,
  state text,
  zip text,
  country text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Safe Profile Policies (No recursion)
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check ((select auth.uid()) = id);
create policy "Users can update own profile." on public.profiles for update using ((select auth.uid()) = id);

-- Trigger for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'customer');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- CATEGORIES
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.categories enable row level security;
create policy "Categories are viewable by everyone" on public.categories for select using (true);
create policy "Admins can insert categories" on public.categories for insert with check ((select public.is_admin()));
create policy "Admins can update categories" on public.categories for update using ((select public.is_admin()));
create policy "Admins can delete categories" on public.categories for delete using ((select public.is_admin()));

-- PRODUCTS
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  price decimal(10,2) not null,
  compare_at_price decimal(10,2),
  stock_quantity integer not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  image_url text,
  is_featured boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint stock_non_negative check (stock_quantity >= 0)
);

alter table public.products enable row level security;
create policy "Products are viewable by everyone" on public.products for select using (true);
create policy "Admins can insert products" on public.products for insert with check ((select public.is_admin()));
create policy "Admins can update products" on public.products for update using ((select public.is_admin()));
create policy "Admins can delete products" on public.products for delete using ((select public.is_admin()));

-- PRODUCT IMAGES
create table public.product_images (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  url text not null,
  alt_text text,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.product_images enable row level security;
create policy "Product images are viewable by everyone" on public.product_images for select using (true);
create policy "Admins can insert product images" on public.product_images for insert with check ((select public.is_admin()));
create policy "Admins can update product images" on public.product_images for update using ((select public.is_admin()));
create policy "Admins can delete product images" on public.product_images for delete using ((select public.is_admin()));

-- CARTS
create table public.carts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- Reference profiles instead of auth.users
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.carts enable row level security;
create policy "Users can view their own cart" on public.carts for select using ((select auth.uid()) = user_id);
create policy "Users can create their own cart" on public.carts for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their own cart" on public.carts for update using ((select auth.uid()) = user_id);

-- CART ITEMS
create table public.cart_items (
  id uuid default uuid_generate_v4() primary key,
  cart_id uuid references public.carts(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(cart_id, product_id)
);

alter table public.cart_items enable row level security;
create policy "Users can view their own cart items" on public.cart_items for select using (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = (select auth.uid())));
create policy "Users can insert into their own cart" on public.cart_items for insert with check (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = (select auth.uid())));
create policy "Users can update their own cart items" on public.cart_items for update using (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = (select auth.uid())));
create policy "Users can delete their own cart items" on public.cart_items for delete using (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = (select auth.uid())));

-- ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null, -- Reference profiles instead of auth.users
  status text default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  total_amount decimal(10,2) not null,
  shipping_address_id uuid,
  shipping_address jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;
create policy "Users and Admins can view orders" on public.orders for select using (((select auth.uid()) = user_id) OR (select public.is_admin()));
create policy "Users can insert their own orders" on public.orders for insert with check ((select auth.uid()) = user_id);
create policy "Admins can update orders" on public.orders for update using ((select public.is_admin()));
create policy "Admins can delete orders" on public.orders for delete using ((select public.is_admin()));

-- ORDER ITEMS
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null,
  price_at_purchase decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.order_items enable row level security;
create policy "Users and Admins can view order items" on public.order_items for select using (
    exists (select 1 from public.orders where id = order_items.order_id and user_id = (select auth.uid()))
    OR (select public.is_admin())
);
create policy "Users can insert their own order items" on public.order_items for insert with check (
  exists (
    select 1 from public.orders 
    where id = order_items.order_id 
    and user_id = (select auth.uid())
  )
);

-- STORE SETTINGS
create table public.store_settings (
  id uuid default uuid_generate_v4() primary key,
  store_name text not null default 'SV Enterprises',
  support_email text not null default 'support@sventerprises.com',
  currency text not null default 'INR',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.store_settings enable row level security;
create policy "Settings are viewable by everyone" on public.store_settings for select using (true);
create policy "Admins can update settings" on public.store_settings for update using ((select public.is_admin()));
create policy "Admins can insert settings" on public.store_settings for insert with check ((select public.is_admin()));

-- Insert default settings
insert into public.store_settings (store_name, support_email) values ('SV Enterprises', 'support@sventerprises.com');

-- COUNTER SALES
create table public.counter_sales (
  id uuid default uuid_generate_v4() primary key,
  sale_date date not null unique default current_date,
  amount numeric not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.counter_sales enable row level security;

create policy "Admin Access Counter Sales"
  on public.counter_sales for all
  using ( (select public.is_admin()) );

-- FUNCTIONS

-- Trending Products
create or replace function public.get_trending_products(limit_count int default 4)
returns setof public.products as $$
begin
  return query
  select p.*
  from public.products p
  join (
    select product_id, sum(quantity) as total_sold
    from public.order_items
    group by product_id
    order by total_sold desc
    limit limit_count
  ) sales on p.id = sales.product_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Daily Revenue
create or replace function public.get_daily_revenue()
returns json as $$
declare
  online_revenue numeric;
  counter_revenue numeric;
begin
  -- Calculate online revenue for today (paid/shipped/delivered)
  select coalesce(sum(total_amount), 0)
  into online_revenue
  from public.orders
  where date(created_at) = current_date
  and status in ('paid', 'shipped', 'delivered');

  -- Get counter sales for today
  select coalesce(amount, 0)
  into counter_revenue
  from public.counter_sales
  where sale_date = current_date;

  return json_build_object(
    'online', online_revenue,
    'counter', counter_revenue,
    'total', online_revenue + counter_revenue
  );
end;
$$ language plpgsql security definer set search_path = public;

-- STORAGE (Create 'products' bucket)
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Storage Policies
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Admin Upload" on storage.objects;
drop policy if exists "Admin Update" on storage.objects;
drop policy if exists "Admin Delete" on storage.objects;

create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'products' );

create policy "Admin Upload"
  on storage.objects for insert
  with check ( bucket_id = 'products' and (select public.is_admin()) );

create policy "Admin Update"
  on storage.objects for update
  using ( bucket_id = 'products' and (select public.is_admin()) );

create policy "Admin Delete"
  on storage.objects for delete
  using ( bucket_id = 'products' and (select public.is_admin()) );

-- STOCK MANAGEMENT
-- Function to Decrement Stock
create or replace function public.decrement_stock()
returns trigger as $$
begin
  update public.products
  set stock_quantity = stock_quantity - new.quantity
  where id = new.product_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on order_items
create trigger on_order_item_created
  after insert on public.order_items
  for each row
  execute procedure public.decrement_stock();
