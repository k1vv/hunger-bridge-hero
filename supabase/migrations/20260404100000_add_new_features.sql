-- ============================================================================
-- Migration: Add New Features
-- Features: User suspension, storage location, distribution photos,
--           batch templates, feedback, beneficiaries
-- ============================================================================

-- 1. User Suspension
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- 2. Physical Location Mapping (Inventory)
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS storage_location TEXT;

-- 3. Distribution Photos
ALTER TABLE public.distribution_records
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- 4. Batch Templates
CREATE TABLE IF NOT EXISTS public.donation_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pickup_location TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  pickup_time_start TIME,
  pickup_time_end TIME,
  contact_person TEXT,
  contact_phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for donation_templates
ALTER TABLE public.donation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage own templates" ON public.donation_templates
  FOR ALL USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can view own templates" ON public.donation_templates
  FOR SELECT USING (auth.uid() = vendor_id);

-- 5. Feedback Collection
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('donation', 'pickup', 'distribution', 'platform', 'vendor', 'ngo')),
  related_entity_type TEXT,
  related_entity_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 6. Beneficiary Registration
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ngo_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ic_last_four TEXT, -- Last 4 digits only for privacy
  phone TEXT,
  address TEXT,
  category TEXT CHECK (category IN ('Homeless', 'Low-income Families', 'Elderly', 'Orphans', 'Students', 'Refugees', 'Disabled', 'General Public', 'Other')),
  household_size INTEGER DEFAULT 1,
  notes TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_distributions INTEGER DEFAULT 0,
  last_distribution_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for beneficiaries
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can manage own beneficiaries" ON public.beneficiaries
  FOR ALL USING (auth.uid() = ngo_id);

-- Junction table for distribution-beneficiary relationship
CREATE TABLE IF NOT EXISTS public.distribution_beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distribution_id UUID REFERENCES public.distribution_records(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  items_received JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(distribution_id, beneficiary_id)
);

-- RLS for distribution_beneficiaries
ALTER TABLE public.distribution_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can manage distribution beneficiaries" ON public.distribution_beneficiaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.distribution_records dr
      WHERE dr.id = distribution_id AND dr.ngo_id = auth.uid()
    )
  );

-- 7. Add completed_at to donation_items for time-to-pickup metrics
ALTER TABLE public.donation_items
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_ngo_id ON public.beneficiaries(ngo_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_category ON public.beneficiaries(category);
CREATE INDEX IF NOT EXISTS idx_donation_templates_vendor_id ON public.donation_templates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_distribution_beneficiaries_distribution ON public.distribution_beneficiaries(distribution_id);
CREATE INDEX IF NOT EXISTS idx_distribution_beneficiaries_beneficiary ON public.distribution_beneficiaries(beneficiary_id);
