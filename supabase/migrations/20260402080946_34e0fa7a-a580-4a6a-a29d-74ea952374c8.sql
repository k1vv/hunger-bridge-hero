
-- Create food_listings table
CREATE TABLE public.food_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  pickup_location TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  spoilage_risk TEXT DEFAULT 'low',
  reserved_by TEXT,
  reserved_at TIMESTAMP WITH TIME ZONE,
  pickup_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view listings
CREATE POLICY "Authenticated users can view all listings"
ON public.food_listings FOR SELECT TO authenticated
USING (true);

-- Users can create their own listings
CREATE POLICY "Users can create own listings"
ON public.food_listings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "Users can update own listings"
ON public.food_listings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "Users can delete own listings"
ON public.food_listings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Admins can update any listing
CREATE POLICY "Admins can update any listing"
ON public.food_listings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any listing
CREATE POLICY "Admins can delete any listing"
ON public.food_listings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_food_listings_updated_at
BEFORE UPDATE ON public.food_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true);

-- Storage policies
CREATE POLICY "Food images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated users can upload food images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'food-images');

CREATE POLICY "Users can update their own food images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own food images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
