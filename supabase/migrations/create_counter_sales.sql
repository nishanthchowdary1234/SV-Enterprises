-- Create counter_sales table
CREATE TABLE IF NOT EXISTS public.counter_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.counter_sales ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage counter sales" ON public.counter_sales
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
