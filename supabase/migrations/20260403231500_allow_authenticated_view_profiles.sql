-- Allow all authenticated users to view basic profile information
-- This is needed for NGOs to see vendor names on claims, and vendors to see NGO names on pickups

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Drop the old restrictive policies that are now redundant
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
