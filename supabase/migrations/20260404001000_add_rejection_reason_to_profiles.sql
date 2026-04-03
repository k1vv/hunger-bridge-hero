-- Add rejection_reason column to profiles for storing verification rejection reasons
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
