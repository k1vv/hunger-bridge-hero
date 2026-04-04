-- Add beneficiary_id to distribution_records
-- This allows direct linking of a distribution to a specific beneficiary

ALTER TABLE distribution_records
ADD COLUMN IF NOT EXISTS beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL;

-- Add photo_urls column if it doesn't exist
ALTER TABLE distribution_records
ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Add inventory_id column if it doesn't exist (for tracking which inventory item)
ALTER TABLE distribution_records
ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL;

-- Create index for faster beneficiary lookups
CREATE INDEX IF NOT EXISTS idx_distribution_records_beneficiary
ON distribution_records(beneficiary_id);

-- Create index for inventory lookups
CREATE INDEX IF NOT EXISTS idx_distribution_records_inventory
ON distribution_records(inventory_id);
