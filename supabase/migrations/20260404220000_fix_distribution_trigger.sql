-- Fix the distribution trigger to handle NULL inventory_id
-- The distribution stores multiple items in notes JSON, not a single inventory_id

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_log_inventory_out ON distribution_records;

-- Update the function to handle cases where inventory_id is NULL
-- In this case, we parse the notes JSON to get item details
CREATE OR REPLACE FUNCTION log_inventory_out_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_beneficiary_name TEXT;
  v_inventory_item RECORD;
  v_notes_data JSONB;
  v_item JSONB;
  v_food_name TEXT;
  v_category TEXT;
BEGIN
  -- Get beneficiary name if exists
  IF NEW.beneficiary_id IS NOT NULL THEN
    SELECT name INTO v_beneficiary_name
    FROM beneficiaries
    WHERE id = NEW.beneficiary_id;
  END IF;

  -- Try to parse notes as JSON to get distribution details
  BEGIN
    v_notes_data := NEW.notes::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_notes_data := NULL;
  END;

  -- If we have inventory_id, get item info directly
  IF NEW.inventory_id IS NOT NULL THEN
    SELECT food_title, category INTO v_food_name, v_category
    FROM inventory
    WHERE id = NEW.inventory_id;

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
      COALESCE(v_food_name, 'Distribution'),
      v_category,
      'beneficiary',
      NEW.beneficiary_id,
      COALESCE(v_beneficiary_name, NEW.beneficiary_group, 'General Distribution'),
      NEW.notes
    );
  ELSIF v_notes_data IS NOT NULL AND v_notes_data ? 'items' THEN
    -- Parse items from notes JSON and log each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_notes_data->'items')
    LOOP
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
        (v_item->>'inventory_id')::uuid,
        'out',
        COALESCE((v_item->>'quantity')::decimal, 0),
        'units',
        COALESCE(v_item->>'food_title', 'Distribution Item'),
        v_item->>'category',
        'beneficiary',
        NEW.beneficiary_id,
        COALESCE(v_beneficiary_name, NEW.beneficiary_group, 'General Distribution'),
        NULL
      );
    END LOOP;
  ELSE
    -- Fallback: log a single generic transaction
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
      NULL,
      'out',
      COALESCE(NEW.quantity_distributed::decimal, 0),
      'units',
      'Distribution',
      NULL,
      'beneficiary',
      NEW.beneficiary_id,
      COALESCE(v_beneficiary_name, NEW.beneficiary_group, 'General Distribution'),
      NEW.notes
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_log_inventory_out
  AFTER INSERT ON distribution_records
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_out_transaction();
