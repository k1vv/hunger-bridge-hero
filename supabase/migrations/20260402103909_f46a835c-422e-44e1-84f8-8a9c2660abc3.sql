
-- =============================================
-- 1. Add columns to food_listings
-- =============================================
ALTER TABLE public.food_listings
  ADD COLUMN IF NOT EXISTS halal_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS storage_condition text DEFAULT 'room_temperature',
  ADD COLUMN IF NOT EXISTS notes_for_receiver text,
  ADD COLUMN IF NOT EXISTS pickup_time_start time,
  ADD COLUMN IF NOT EXISTS pickup_time_end time;

-- =============================================
-- 2. Add columns to profiles
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS operation_hours text,
  ADD COLUMN IF NOT EXISTS food_types text[],
  ADD COLUMN IF NOT EXISTS service_area text,
  ADD COLUMN IF NOT EXISTS storage_capacity text;

-- =============================================
-- 3. Claims table
-- =============================================
CREATE TABLE public.claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_listing_id uuid NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  ngo_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pickup_scheduled_at timestamptz,
  volunteer_name text,
  volunteer_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can create claims" ON public.claims
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = ngo_user_id);

CREATE POLICY "Users can view own claims" ON public.claims
  FOR SELECT TO authenticated
  USING (auth.uid() = ngo_user_id);

CREATE POLICY "Vendors can view claims on their listings" ON public.claims
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.food_listings fl
      WHERE fl.id = food_listing_id AND fl.user_id = auth.uid()
    )
  );

CREATE POLICY "NGOs can update own claims" ON public.claims
  FOR UPDATE TO authenticated
  USING (auth.uid() = ngo_user_id);

CREATE POLICY "Admins can do anything with claims" ON public.claims
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. Notifications table
-- =============================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. Complaints table
-- =============================================
CREATE TABLE public.complaints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  complaint_type text NOT NULL,
  description text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create complaints" ON public.complaints
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own complaints" ON public.complaints
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all complaints" ON public.complaints
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. Audit logs table
-- =============================================
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- 7. Announcements table
-- =============================================
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. Distribution records table
-- =============================================
CREATE TABLE public.distribution_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ngo_user_id uuid NOT NULL,
  claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  beneficiary_group text,
  quantity_distributed text,
  distribution_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.distribution_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can manage own distribution records" ON public.distribution_records
  FOR ALL TO authenticated
  USING (auth.uid() = ngo_user_id);

CREATE POLICY "Admins can view all distribution records" ON public.distribution_records
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 9. Inventory table
-- =============================================
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ngo_user_id uuid NOT NULL,
  claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  food_title text NOT NULL,
  category text,
  quantity_received text,
  quantity_distributed text DEFAULT '0',
  quantity_remaining text,
  expiry_date date,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs can manage own inventory" ON public.inventory
  FOR ALL TO authenticated
  USING (auth.uid() = ngo_user_id);

CREATE POLICY "Admins can view all inventory" ON public.inventory
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 10. Enable realtime for notifications
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
