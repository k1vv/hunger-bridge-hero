-- Inventory Transactions Table
-- Tracks all inventory movements (IN from donations, OUT to distributions)

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,

  -- Transaction type: 'in' (received) or 'out' (distributed)
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment', 'waste')),

  -- Quantity moved (positive number)
  quantity DECIMAL NOT NULL,
  unit TEXT DEFAULT 'units',

  -- What food item
  food_name TEXT NOT NULL,
  category TEXT,

  -- Source info (for IN transactions)
  source_type TEXT, -- 'donation', 'purchase', 'transfer', 'manual'
  source_id UUID, -- donation_item_id or batch_id if from donation
  source_name TEXT, -- vendor name or other source

  -- Destination info (for OUT transactions)
  destination_type TEXT, -- 'beneficiary', 'waste', 'transfer'
  destination_id UUID, -- beneficiary_id if applicable
  destination_name TEXT, -- beneficiary name or waste reason

  -- Additional info
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- NGO can view their own transactions
CREATE POLICY "NGO can view own transactions" ON inventory_transactions
  FOR SELECT USING (auth.uid() = ngo_user_id);

-- NGO can insert their own transactions
CREATE POLICY "NGO can insert own transactions" ON inventory_transactions
  FOR INSERT WITH CHECK (auth.uid() = ngo_user_id);

-- Create indexes for performance
CREATE INDEX idx_inventory_transactions_ngo ON inventory_transactions(ngo_user_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_created ON inventory_transactions(created_at DESC);

-- Function to automatically log IN transaction when pickup is confirmed
-- This triggers when donation_items status changes to 'picked_up'
CREATE OR REPLACE FUNCTION log_inventory_in_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_name TEXT;
  v_batch_id UUID;
  v_ngo_id UUID;
BEGIN
  -- Only proceed if status changed to 'picked_up'
  IF NEW.status = 'picked_up' AND (OLD.status IS NULL OR OLD.status != 'picked_up') THEN
    -- Get vendor name and batch info
    SELECT
      db.id,
      COALESCE(p.business_name, p.name, 'Unknown Vendor')
    INTO v_batch_id, v_vendor_name
    FROM donation_batches db
    LEFT JOIN profiles p ON db.vendor_id = p.id
    WHERE db.id = NEW.batch_id;

    -- Get NGO ID (claimed_by)
    v_ngo_id := NEW.claimed_by;

    IF v_ngo_id IS NOT NULL THEN
      -- Log the IN transaction
      INSERT INTO inventory_transactions (
        ngo_user_id,
        transaction_type,
        quantity,
        unit,
        food_name,
        category,
        source_type,
        source_id,
        source_name,
        notes
      ) VALUES (
        v_ngo_id,
        'in',
        NEW.quantity,
        NEW.unit,
        NEW.food_name,
        NEW.category,
        'donation',
        NEW.id,
        v_vendor_name,
        'Received from donation pickup'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pickup confirmation
DROP TRIGGER IF EXISTS trigger_log_inventory_in ON donation_items;
CREATE TRIGGER trigger_log_inventory_in
  AFTER UPDATE ON donation_items
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_in_transaction();

-- Function to log OUT transaction when distribution happens
CREATE OR REPLACE FUNCTION log_inventory_out_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_beneficiary_name TEXT;
  v_inventory_item RECORD;
BEGIN
  -- Get beneficiary name if exists
  IF NEW.beneficiary_id IS NOT NULL THEN
    SELECT name INTO v_beneficiary_name
    FROM beneficiaries
    WHERE id = NEW.beneficiary_id;
  END IF;

  -- Try to get inventory item info
  IF NEW.inventory_id IS NOT NULL THEN
    SELECT * INTO v_inventory_item
    FROM inventory
    WHERE id = NEW.inventory_id;
  END IF;

  -- Log the OUT transaction
  INSERT INTO inventory_transactions (
    ngo_user_id,
    inventory_id,
    transaction_type,
    quantity,
    unit,
    food_name,
    category,
    destination_type,
    destination_id,
    destination_name,
    notes
  ) VALUES (
    NEW.ngo_user_id,
    NEW.inventory_id,
    'out',
    COALESCE(NEW.quantity_distributed::decimal, 0),
    'units',
    COALESCE(v_inventory_item.food_title, 'Unknown Item'),
    v_inventory_item.category,
    'beneficiary',
    NEW.beneficiary_id,
    COALESCE(v_beneficiary_name, NEW.beneficiary_group, 'General Distribution'),
    NEW.notes
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for distribution records
DROP TRIGGER IF EXISTS trigger_log_inventory_out ON distribution_records;
CREATE TRIGGER trigger_log_inventory_out
  AFTER INSERT ON distribution_records
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_out_transaction();
