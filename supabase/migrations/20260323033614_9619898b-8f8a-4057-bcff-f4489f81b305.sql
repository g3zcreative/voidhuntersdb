
-- 1. tier_list_contexts
CREATE TABLE public.tier_list_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tier_list_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tier_list_contexts" ON public.tier_list_contexts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can do everything on tier_list_contexts" ON public.tier_list_contexts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. tier_list_criteria
CREATE TABLE public.tier_list_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 1,
  max_score integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tier_list_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tier_list_criteria" ON public.tier_list_criteria FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can do everything on tier_list_criteria" ON public.tier_list_criteria FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. hunter_tier_entries
CREATE TABLE public.hunter_tier_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_id uuid NOT NULL REFERENCES public.hunters(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES public.tier_list_contexts(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'DPS',
  criteria_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric NOT NULL DEFAULT 0,
  tier text,
  tier_override text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hunter_id, context_id)
);
ALTER TABLE public.hunter_tier_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read hunter_tier_entries" ON public.hunter_tier_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can do everything on hunter_tier_entries" ON public.hunter_tier_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. tier_score_ranges
CREATE TABLE public.tier_score_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  min_score numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tier_score_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tier_score_ranges" ON public.tier_score_ranges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can do everything on tier_score_ranges" ON public.tier_score_ranges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default contexts
INSERT INTO public.tier_list_contexts (name, slug, sort_order) VALUES
  ('Generic PVE', 'generic-pve', 0),
  ('PVP', 'pvp', 1);

-- Seed default criteria
INSERT INTO public.tier_list_criteria (name, description, weight, max_score, sort_order) VALUES
  ('Damage Output', 'Raw damage potential and scaling', 3, 10, 0),
  ('Utility', 'Buffs, debuffs, crowd control, and team support', 2, 10, 1),
  ('Survivability', 'Tankiness, self-healing, and damage mitigation', 2, 10, 2),
  ('Skill Synergy', 'How well skills combo with team compositions', 1.5, 10, 3),
  ('Ease of Use', 'Accessibility and skill floor/ceiling', 1, 10, 4);

-- Seed default tier score ranges (based on max possible = 95: 10*3 + 10*2 + 10*2 + 10*1.5 + 10*1 = 95)
INSERT INTO public.tier_score_ranges (tier, min_score, sort_order) VALUES
  ('T0', 85, 0),
  ('T0.5', 72, 1),
  ('T1', 57, 2),
  ('T1.5', 42, 3),
  ('T2', 28, 4),
  ('T3', 0, 5);
