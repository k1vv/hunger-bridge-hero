-- Move estimated_value from donation_batches to donation_items
-- Each food item now has its own estimated value instead of batch-level

-- Step 1: Add estimated_value column to donation_items
ALTER TABLE donation_items
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN donation_items.estimated_value IS 'Vendor-provided estimated value of this item in RM';

-- Step 2: Remove estimated_value from donation_batches (optional - can keep for backward compatibility)
-- ALTER TABLE donation_batches DROP COLUMN IF EXISTS estimated_value;
-- Keeping it for now but it won't be used going forward
