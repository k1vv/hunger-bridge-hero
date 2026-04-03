-- Add address coordinate columns to profiles table for location-based recommendations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address_lng DOUBLE PRECISION;

-- Update handle_new_user function to include address coordinates from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, address, address_lat, address_lng)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    (NEW.raw_user_meta_data->>'address_lat')::DOUBLE PRECISION,
    (NEW.raw_user_meta_data->>'address_lng')::DOUBLE PRECISION
  );
  -- Insert role from metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::app_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing profiles with coordinates from auth.users metadata (for users who signed up before this migration)
UPDATE public.profiles p
SET
  address_lat = (u.raw_user_meta_data->>'address_lat')::DOUBLE PRECISION,
  address_lng = (u.raw_user_meta_data->>'address_lng')::DOUBLE PRECISION
FROM auth.users u
WHERE p.id = u.id
  AND p.address_lat IS NULL
  AND u.raw_user_meta_data->>'address_lat' IS NOT NULL;
