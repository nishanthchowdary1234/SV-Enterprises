-- Allow admins to delete orders
create policy "Admins can delete orders" on public.orders for delete using ((select public.is_admin()));
