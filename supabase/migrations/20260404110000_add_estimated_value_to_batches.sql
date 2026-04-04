-- Add estimated_value column to donation_batches table
-- This stores the vendor's estimated value of the donation in RM

ALTER TABLE donation_batches
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10, 2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN donation_batches.estimated_value IS 'Vendor-provided estimated value of the donation in RM';
