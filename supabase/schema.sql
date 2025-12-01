-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- PROFILES (Extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  role text default 'customer' check (role in ('customer', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'customer');
  return new;
end;
$$ language plpgsql security definer;

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
create policy "Admins can insert categories" on public.categories for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update categories" on public.categories for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete categories" on public.categories for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


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
  image_url text, -- Primary image
  is_featured boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;
create policy "Products are viewable by everyone" on public.products for select using (true);
create policy "Admins can insert products" on public.products for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update products" on public.products for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete products" on public.products for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


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
create policy "Admins can manage product images" on public.product_images for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- CARTS
create table public.carts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade, -- Nullable for guest carts (if we support them, otherwise require auth)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.carts enable row level security;
create policy "Users can view their own cart" on public.carts for select using (auth.uid() = user_id);
create policy "Users can create their own cart" on public.carts for insert with check (auth.uid() = user_id);
create policy "Users can update their own cart" on public.carts for update using (auth.uid() = user_id);


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
create policy "Users can view their own cart items" on public.cart_items for select using (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = auth.uid()));
create policy "Users can insert into their own cart" on public.cart_items for insert with check (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = auth.uid()));
create policy "Users can update their own cart items" on public.cart_items for update using (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = auth.uid()));
create policy "Users can delete their own cart items" on public.cart_items for delete using (exists (select 1 from public.carts where id = cart_items.cart_id and user_id = auth.uid()));


-- ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  status text default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  total_amount decimal(10,2) not null,
  shipping_address_id uuid, -- Link to addresses table later
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;
create policy "Users can view their own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Admins can view all orders" on public.orders for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update orders" on public.orders for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


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
create policy "Users can view their own order items" on public.order_items for select using (exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid()));
create policy "Admins can view all order items" on public.order_items for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- STORAGE BUCKETS
-- Note: You need to create 'products' and 'avatars' buckets in the Supabase Dashboard Storage section.
-- Policies for storage would be:
-- Products: Public Read, Admin Write
-- Avatars: Public Read, User Write (own folder)
