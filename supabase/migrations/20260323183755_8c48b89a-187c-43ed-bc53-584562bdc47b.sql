
-- User-created tier lists
CREATE TABLE public.user_tier_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES tier_list_contexts(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tier_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tier lists" ON public.user_tier_lists
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone can read public tier lists" ON public.user_tier_lists
  FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE POLICY "Users can insert own tier lists" ON public.user_tier_lists
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tier lists" ON public.user_tier_lists
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tier lists" ON public.user_tier_lists
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can read all tier lists" ON public.user_tier_lists
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_user_tier_lists
  BEFORE UPDATE ON public.user_tier_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User tier entries
CREATE TABLE public.user_tier_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_list_id uuid NOT NULL REFERENCES user_tier_lists(id) ON DELETE CASCADE,
  hunter_id uuid NOT NULL REFERENCES hunters(id) ON DELETE CASCADE,
  tier text NOT NULL,
  role text NOT NULL DEFAULT 'DPS',
  notes text,
  UNIQUE(tier_list_id, hunter_id)
);

ALTER TABLE public.user_tier_entries ENABLE ROW LEVEL SECURITY;

-- For entries, we check ownership via the parent tier list
CREATE POLICY "Users can read own entries" ON public.user_tier_entries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tier_lists WHERE id = tier_list_id AND user_id = auth.uid()));

CREATE POLICY "Anyone can read public list entries" ON public.user_tier_entries
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM user_tier_lists WHERE id = tier_list_id AND is_public = true));

CREATE POLICY "Users can insert own entries" ON public.user_tier_entries
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_tier_lists WHERE id = tier_list_id AND user_id = auth.uid()));

CREATE POLICY "Users can update own entries" ON public.user_tier_entries
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tier_lists WHERE id = tier_list_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM user_tier_lists WHERE id = tier_list_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own entries" ON public.user_tier_entries
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tier_lists WHERE id = tier_list_id AND user_id = auth.uid()));
