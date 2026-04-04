-- Create claim_cancellations table to track NGO cancellation history
-- This allows items to be re-available while keeping history for NGOs
CREATE TABLE IF NOT EXISTS claim_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES donation_items(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES donation_batches(id) ON DELETE CASCADE,
  ngo_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT,
  cancelled_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

-- Index for fast lookup by NGO
CREATE INDEX IF NOT EXISTS idx_claim_cancellations_ngo_id ON claim_cancellations(ngo_id);
CREATE INDEX IF NOT EXISTS idx_claim_cancellations_cancelled_at ON claim_cancellations(cancelled_at DESC);

-- RLS policies
ALTER TABLE claim_cancellations ENABLE ROW LEVEL SECURITY;

-- NGOs can view their own cancellations
CREATE POLICY "NGOs can view own cancellations"
ON claim_cancellations FOR SELECT
TO authenticated
USING (ngo_id = auth.uid());

-- NGOs can insert their own cancellations
CREATE POLICY "NGOs can insert own cancellations"
ON claim_cancellations FOR INSERT
TO authenticated
WITH CHECK (ngo_id = auth.uid());

-- Admins can view all cancellations
CREATE POLICY "Admins can view all cancellations"
ON claim_cancellations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
