-- Create beneficiaries table for NGO beneficiary management
CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  household_size INTEGER DEFAULT 1,
  category TEXT DEFAULT 'general', -- elderly, family, student, disabled, refugee, homeless, orphanage, general
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create distribution_beneficiaries junction table to track who received what
CREATE TABLE IF NOT EXISTS distribution_beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL REFERENCES distribution_records(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  items_received JSONB, -- Array of {item_name, quantity, unit}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_beneficiaries ENABLE ROW LEVEL SECURITY;

-- Beneficiaries: NGO can manage their own beneficiaries
CREATE POLICY beneficiaries_ngo_all ON beneficiaries
  FOR ALL USING (ngo_id = auth.uid());

-- Distribution beneficiaries: NGO can manage their own
CREATE POLICY distribution_beneficiaries_ngo_all ON distribution_beneficiaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM distribution_records dr
      WHERE dr.id = distribution_beneficiaries.distribution_id
      AND dr.ngo_user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_beneficiaries_ngo_id ON beneficiaries(ngo_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_category ON beneficiaries(category);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_is_active ON beneficiaries(is_active);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_name ON beneficiaries(name);
CREATE INDEX IF NOT EXISTS idx_distribution_beneficiaries_distribution_id ON distribution_beneficiaries(distribution_id);
CREATE INDEX IF NOT EXISTS idx_distribution_beneficiaries_beneficiary_id ON distribution_beneficiaries(beneficiary_id);
