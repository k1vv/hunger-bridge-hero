-- Add new vendor profile fields for business details

-- Business type (Restaurant, Cafe, Bakery, Hotel, Supermarket, Event Organizer, Other)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Branch name for multi-location businesses
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_name TEXT;

-- Whether vendor has multiple outlets
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_multiple_outlets BOOLEAN DEFAULT false;
