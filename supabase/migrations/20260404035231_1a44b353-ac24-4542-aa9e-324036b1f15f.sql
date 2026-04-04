
-- Create donation_templates table
CREATE TABLE public.donation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  name TEXT NOT NULL,
  pickup_location TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  pickup_time_start TIME,
  pickup_time_end TIME,
  contact_person TEXT,
  contact_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own templates" ON public.donation_templates FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can create own templates" ON public.donation_templates FOR INSERT WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Vendors can update own templates" ON public.donation_templates FOR UPDATE USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can delete own templates" ON public.donation_templates FOR DELETE USING (auth.uid() = vendor_id);

CREATE TRIGGER update_donation_templates_updated_at BEFORE UPDATE ON public.donation_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON public.feedback FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
