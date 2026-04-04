-- ============================================================================
-- AUTO BATCH STATUS MANAGEMENT TRIGGERS
-- Automatically updates batch status when items change
-- ============================================================================

-- Function to recalculate and update batch status
CREATE OR REPLACE FUNCTION update_batch_status()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id UUID;
  v_available_count INT;
  v_claimed_count INT;
  v_completed_count INT;
  v_total_count INT;
  v_new_status TEXT;
  v_current_status TEXT;
BEGIN
  -- Get the batch_id from either NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    v_batch_id := OLD.batch_id;
  ELSE
    v_batch_id := NEW.batch_id;
  END IF;

  -- Count items by status
  SELECT
    COUNT(*) FILTER (WHERE status = 'available'),
    COUNT(*) FILTER (WHERE status = 'claimed'),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*)
  INTO v_available_count, v_claimed_count, v_completed_count, v_total_count
  FROM donation_items
  WHERE batch_id = v_batch_id;

  -- Get current batch status
  SELECT status INTO v_current_status
  FROM donation_batches
  WHERE id = v_batch_id;

  -- Determine new status based on item counts
  IF v_total_count = 0 THEN
    -- No items, keep current status or set to available
    v_new_status := COALESCE(v_current_status, 'available');
  ELSIF v_completed_count = v_total_count THEN
    -- All items completed
    v_new_status := 'completed';
  ELSIF v_claimed_count > 0 AND v_available_count > 0 THEN
    -- Mix of claimed and available
    v_new_status := 'partially_claimed';
  ELSIF v_claimed_count > 0 AND v_available_count = 0 THEN
    -- All non-completed items are claimed
    v_new_status := 'reserved';
  ELSIF v_available_count > 0 THEN
    -- Has available items
    v_new_status := 'available';
  ELSE
    -- Fallback
    v_new_status := v_current_status;
  END IF;

  -- Only update if status actually changed
  IF v_new_status IS DISTINCT FROM v_current_status THEN
    UPDATE donation_batches
    SET status = v_new_status, updated_at = NOW()
    WHERE id = v_batch_id;

    RAISE NOTICE 'Batch % status updated: % -> %', v_batch_id, v_current_status, v_new_status;
  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger on donation_items for INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_update_batch_status ON donation_items;

CREATE TRIGGER trigger_update_batch_status
AFTER INSERT OR UPDATE OF status, claimed_by OR DELETE
ON donation_items
FOR EACH ROW
EXECUTE FUNCTION update_batch_status();

-- ============================================================================
-- NOTIFICATION TRIGGER - Creates notifications on important events
-- ============================================================================

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_event_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
  v_ngo_id UUID;
  v_batch_number TEXT;
  v_food_name TEXT;
BEGIN
  -- Get batch info
  SELECT db.vendor_id, db.batch_number, NEW.food_name
  INTO v_vendor_id, v_batch_number, v_food_name
  FROM donation_batches db
  WHERE db.id = NEW.batch_id;

  -- Item claimed - notify vendor
  IF TG_OP = 'UPDATE' AND OLD.status = 'available' AND NEW.status = 'claimed' THEN
    INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (
      v_vendor_id,
      'claim',
      'Item Claimed',
      format('Your item "%s" from batch %s has been claimed', v_food_name, v_batch_number),
      'donation_item',
      NEW.id
    );
  END IF;

  -- Item unclaimed (cancelled) - notify vendor
  IF TG_OP = 'UPDATE' AND OLD.status = 'claimed' AND NEW.status = 'available' AND OLD.claimed_by IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (
      v_vendor_id,
      'cancellation',
      'Claim Cancelled',
      format('A claim on "%s" from batch %s was cancelled', v_food_name, v_batch_number),
      'donation_item',
      NEW.id
    );
  END IF;

  -- Item completed (picked up) - notify NGO
  IF TG_OP = 'UPDATE' AND OLD.status = 'claimed' AND NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (
      NEW.claimed_by,
      'pickup_complete',
      'Pickup Confirmed',
      format('Your pickup of "%s" has been confirmed. Item added to inventory.', v_food_name),
      'donation_item',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notifications
DROP TRIGGER IF EXISTS trigger_create_notifications ON donation_items;

CREATE TRIGGER trigger_create_notifications
AFTER UPDATE OF status
ON donation_items
FOR EACH ROW
EXECUTE FUNCTION create_event_notification();

-- ============================================================================
-- AUTO INVENTORY TRIGGER - Adds items to NGO inventory on pickup completion
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_add_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_name TEXT;
  v_batch_number TEXT;
  v_pickup_location TEXT;
BEGIN
  -- Only trigger when item status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status = 'claimed' AND NEW.claimed_by IS NOT NULL THEN

    -- Get vendor info for source tracking
    SELECT
      COALESCE(p.business_name, p.name, 'Unknown Vendor'),
      db.batch_number,
      db.pickup_location
    INTO v_vendor_name, v_batch_number, v_pickup_location
    FROM donation_batches db
    LEFT JOIN profiles p ON p.id = db.vendor_id
    WHERE db.id = NEW.batch_id;

    -- Check if inventory entry already exists (prevent duplicates)
    IF NOT EXISTS (
      SELECT 1 FROM inventory
      WHERE ngo_user_id = NEW.claimed_by
      AND notes LIKE '%"donation_item_id":"' || NEW.id || '"%'
    ) THEN
      -- Insert into inventory
      INSERT INTO inventory (
        ngo_user_id,
        food_title,
        category,
        quantity_received,
        quantity_remaining,
        expiry_date,
        notes
      ) VALUES (
        NEW.claimed_by,
        NEW.food_name,
        COALESCE(NEW.category, 'Other'),
        COALESCE(NEW.quantity::text, '1'),
        COALESCE(NEW.quantity::text, '1'),
        NEW.expiry_date,
        jsonb_build_object(
          'source_type', 'donation',
          'source_name', v_vendor_name,
          'donation_item_id', NEW.id,
          'batch_number', v_batch_number,
          'pickup_location', v_pickup_location
        )::text
      );

      RAISE NOTICE 'Auto-added item % to inventory for NGO %', NEW.id, NEW.claimed_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto inventory
DROP TRIGGER IF EXISTS trigger_auto_inventory ON donation_items;

CREATE TRIGGER trigger_auto_inventory
AFTER UPDATE OF status
ON donation_items
FOR EACH ROW
EXECUTE FUNCTION auto_add_to_inventory();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION update_batch_status() IS 'Automatically updates batch status based on item statuses';
COMMENT ON FUNCTION create_event_notification() IS 'Creates notifications for claim/cancel/pickup events';
COMMENT ON FUNCTION auto_add_to_inventory() IS 'Auto-adds items to NGO inventory when pickup is confirmed';
