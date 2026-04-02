
-- =============================================
-- 1. Donation Batches table
-- =============================================
CREATE TABLE public.donation_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number text NOT NULL DEFAULT 'D' || floor(random() * 90000 + 10000)::text,
  vendor_id uuid NOT NULL,
  pickup_location text NOT NULL,
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_date date NOT NULL DEFAULT CURRENT_DATE,
  pickup_time_start time,
  pickup_time_end time,
  contact_person text,
  contact_phone text,
  donation_type text NOT NULL DEFAULT 'immediate',
  notes text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_batches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view batches" ON public.donation_batches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendors can create own batches" ON public.donation_batches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update own batches" ON public.donation_batches
  FOR UPDATE TO authenticated
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete own batches" ON public.donation_batches
  FOR DELETE TO authenticated
  USING (auth.uid() = vendor_id);

CREATE POLICY "Admins manage all batches" ON public.donation_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_donation_batches_updated_at
  BEFORE UPDATE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. Donation Items table
-- =============================================
CREATE TABLE public.donation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.donation_batches(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  category text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'packs',
  expiry_date date,
  expiry_time time,
  storage_condition text NOT NULL DEFAULT 'room_temperature',
  halal_status text NOT NULL DEFAULT 'unknown',
  image_url text,
  notes text,
  status text NOT NULL DEFAULT 'available',
  spoilage_risk text DEFAULT 'low',
  claimed_by uuid,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view items" ON public.donation_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendors can create items in own batches" ON public.donation_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.donation_batches b
      WHERE b.id = batch_id AND b.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update items in own batches" ON public.donation_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donation_batches b
      WHERE b.id = batch_id AND b.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete items in own batches" ON public.donation_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donation_batches b
      WHERE b.id = batch_id AND b.vendor_id = auth.uid()
    )
  );

CREATE POLICY "NGOs can update item claims" ON public.donation_items
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'ngo') AND status = 'available'
  );

CREATE POLICY "Admins manage all items" ON public.donation_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_donation_items_updated_at
  BEFORE UPDATE ON public.donation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. Auto-generate batch numbers with sequence
-- =============================================
CREATE SEQUENCE IF NOT EXISTS batch_number_seq START 100;

CREATE OR REPLACE FUNCTION public.generate_batch_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.batch_number := 'D' || nextval('batch_number_seq')::text;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_batch_number
  BEFORE INSERT ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.generate_batch_number();
