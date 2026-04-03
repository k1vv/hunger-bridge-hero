-- Allow NGOs to update donation items they have claimed (for cancelling claims)
-- This enables NGOs to cancel their own claims by setting status back to available

CREATE POLICY "NGOs can update items they claimed"
  ON public.donation_items FOR UPDATE
  TO authenticated
  USING (claimed_by = auth.uid())
  WITH CHECK (true);
