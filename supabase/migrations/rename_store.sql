-- Rename store to SV Enterprises
UPDATE public.store_settings
SET 
  store_name = 'SV Enterprises',
  support_email = 'svtraders82@gmail.com'
WHERE store_name = 'SV Traders';
