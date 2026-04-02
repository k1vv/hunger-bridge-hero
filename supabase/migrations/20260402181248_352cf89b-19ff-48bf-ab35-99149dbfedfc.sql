
-- Drop the existing NGO update policy
DROP POLICY "NGOs can update item claims" ON public.donation_items;

-- Recreate with proper USING (old row) and WITH CHECK (new row)
CREATE POLICY "NGOs can update item claims"
ON public.donation_items
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'ngo'::app_role) AND status = 'available')
WITH CHECK (has_role(auth.uid(), 'ngo'::app_role) AND status = 'claimed' AND claimed_by = auth.uid());
