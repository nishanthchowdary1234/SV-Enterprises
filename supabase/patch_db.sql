-- 1. Update is_admin function (Safe to replace)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Create store_settings table if it doesn't exist
create table if not exists public.store_settings (
  id uuid default uuid_generate_v4() primary key,
  store_name text not null default 'SV Traders',
  support_email text not null default 'support@svtraders.com',
  currency text not null default 'INR',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default settings if table is empty
insert into public.store_settings (store_name, support_email)
select 'SV Traders', 'support@svtraders.com'
where not exists (select 1 from public.store_settings);

-- 3. Create 'products' storage bucket
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- 4. Storage Policies
-- Drop existing policies to avoid conflicts
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Admin Upload" on storage.objects;
drop policy if exists "Admin Update" on storage.objects;
drop policy if exists "Admin Delete" on storage.objects;

-- Re-create Storage Policies
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'products' );

create policy "Admin Upload"
  on storage.objects for insert
  with check ( bucket_id = 'products' and public.is_admin() );

create policy "Admin Update"
  on storage.objects for update
  using ( bucket_id = 'products' and public.is_admin() );

create policy "Admin Delete"
  on storage.objects for delete
  using ( bucket_id = 'products' and public.is_admin() );

-- 5. Fix Orders Table (Add shipping_address column)
alter table public.orders 
add column if not exists shipping_address jsonb;

-- 6. Add INSERT policies for Orders and Order Items (Fixing RLS Error)
drop policy if exists "Users can insert their own orders" on public.orders;
create policy "Users can insert their own orders" 
on public.orders for insert 
with check (auth.uid() = user_id);

drop policy if exists "Users can insert their own order items" on public.order_items;
create policy "Users can insert their own order items" 
on public.order_items for insert 
with check (
  exists (
    select 1 from public.orders 
    where id = order_items.order_id 
    and user_id = auth.uid()
  )
);

-- 7. Create Trending Products Function
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
$$ language plpgsql security definer;

-- 8. Create Counter Sales Table
create table if not exists public.counter_sales (
  id uuid default uuid_generate_v4() primary key,
  sale_date date not null unique default current_date,
  amount numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. RLS for Counter Sales
alter table public.counter_sales enable row level security;

create policy "Admin Access Counter Sales"
  on public.counter_sales for all
  using ( public.is_admin() );

-- 10. Create Daily Revenue Function
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
$$ language plpgsql security definer;
