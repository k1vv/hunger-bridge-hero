
-- Drop all existing UPDATE policies on donation_items
DROP POLICY IF EXISTS "NGO can claim available items" ON public.donation_items;
DROP POLICY IF EXISTS "NGOs can update item claims" ON public.donation_items;
DROP POLICY IF EXISTS "NGOs can update items they claimed" ON public.donation_items;
DROP POLICY IF EXISTS "Users can update own claimed items" ON public.donation_items;
DROP POLICY IF EXISTS "Vendors can manage own batch items" ON public.donation_items;
DROP POLICY IF EXISTS "Vendors can update items in own batches" ON public.donation_items;

-- NGOs can claim available items (set status to claimed, set claimed_by to self)
CREATE POLICY "NGOs can claim available items"
ON public.donation_items FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'ngo'::app_role)
  AND status = 'available'
)
WITH CHECK (
  has_role(auth.uid(), 'ngo'::app_role)
  AND status = 'claimed'
  AND claimed_by = auth.uid()
);

-- NGOs can unclaim/cancel items they claimed (set status back to available, clear claimed_by)
CREATE POLICY "NGOs can unclaim their items"
ON public.donation_items FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'ngo'::app_role)
  AND claimed_by = auth.uid()
)
WITH CHECK (true);

-- Vendors can update any items in their own batches (confirm pickup, cancel reservation, etc.)
CREATE POLICY "Vendors can update own batch items"
ON public.donation_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM donation_batches b
    WHERE b.id = donation_items.batch_id
    AND b.vendor_id = auth.uid()
  )
)
WITH CHECK (true);
