-- Add pickup_photo_url column to donation_items for optional photo evidence
ALTER TABLE donation_items
ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN donation_items.pickup_photo_url IS 'Optional photo URL uploaded by vendor when confirming pickup';

-- Create storage bucket for pickup photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pickup-photos', 'pickup-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload pickup photos
CREATE POLICY "Authenticated users can upload pickup photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pickup-photos');

-- Allow public read access to pickup photos
CREATE POLICY "Public can view pickup photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pickup-photos');

-- Allow users to delete their own pickup photos
CREATE POLICY "Users can delete own pickup photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pickup-photos');
