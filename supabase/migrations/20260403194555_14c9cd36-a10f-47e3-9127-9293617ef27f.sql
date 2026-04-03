
-- Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS has_multiple_outlets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branch_name text;

-- Create outlets table
CREATE TABLE public.outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outlet_name TEXT NOT NULL,
  address TEXT,
  address_lat DOUBLE PRECISION,
  address_lng DOUBLE PRECISION,
  contact_person TEXT,
  contact_phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own outlets"
  ON public.outlets FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create own outlets"
  ON public.outlets FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own outlets"
  ON public.outlets FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own outlets"
  ON public.outlets FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all outlets"
  ON public.outlets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger
CREATE TRIGGER update_outlets_updated_at
  BEFORE UPDATE ON public.outlets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
