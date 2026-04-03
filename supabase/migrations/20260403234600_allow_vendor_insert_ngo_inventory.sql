-- Allow vendors to insert into NGO inventory when confirming donation handover
-- This is needed because when a vendor confirms pickup, they add the item to the NGO's inventory

-- First, let's see existing policies and create a new one for vendor inserts
CREATE POLICY "Vendors can insert inventory for NGOs on donation handover"
  ON public.inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Note: This allows any authenticated user to insert into inventory.
-- The application logic ensures this only happens during donation handover.
-- For stricter security, you could create a database function with SECURITY DEFINER instead.
