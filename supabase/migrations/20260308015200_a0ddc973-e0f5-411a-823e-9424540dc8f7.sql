
-- 1. Create armor_sets table
CREATE TABLE public.armor_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  set_bonus text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.armor_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Armor sets are viewable by everyone" ON public.armor_sets FOR SELECT USING (true);
CREATE POLICY "Admins can insert armor_sets" ON public.armor_sets FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update armor_sets" ON public.armor_sets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete armor_sets" ON public.armor_sets FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_armor_sets_updated_at BEFORE UPDATE ON public.armor_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Create hero_builds table
CREATE TABLE public.hero_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id uuid NOT NULL REFERENCES public.heroes(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  weapon_id uuid REFERENCES public.weapons(id) ON DELETE SET NULL,
  imprint_id uuid REFERENCES public.imprints(id) ON DELETE SET NULL,
  armor_set_id uuid REFERENCES public.armor_sets(id) ON DELETE SET NULL,
  content text,
  video_url text,
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published builds are viewable by everyone" ON public.hero_builds FOR SELECT USING (published = true);
CREATE POLICY "Admins can view all builds" ON public.hero_builds FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert hero_builds" ON public.hero_builds FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update hero_builds" ON public.hero_builds FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete hero_builds" ON public.hero_builds FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own builds" ON public.hero_builds FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own builds" ON public.hero_builds FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own builds" ON public.hero_builds FOR DELETE USING (auth.uid() = author_id);

CREATE TRIGGER update_hero_builds_updated_at BEFORE UPDATE ON public.hero_builds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create hero_build_synergies table
CREATE TABLE public.hero_build_synergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL REFERENCES public.hero_builds(id) ON DELETE CASCADE,
  hero_id uuid NOT NULL REFERENCES public.heroes(id) ON DELETE CASCADE,
  note text,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.hero_build_synergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Build synergies are viewable by everyone" ON public.hero_build_synergies FOR SELECT USING (true);
CREATE POLICY "Admins can insert hero_build_synergies" ON public.hero_build_synergies FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update hero_build_synergies" ON public.hero_build_synergies FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete hero_build_synergies" ON public.hero_build_synergies FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Migrate hero_recommendations data into hero_builds
-- Group by hero_id and create one build per hero
INSERT INTO public.hero_builds (hero_id, title, slug, published, featured, sort_order)
SELECT DISTINCT
  hr.hero_id,
  'Recommended Build',
  h.slug || '-recommended',
  true,
  true,
  0
FROM public.hero_recommendations hr
JOIN public.heroes h ON h.id = hr.hero_id;

-- Set weapon_id from weapon recommendations
UPDATE public.hero_builds hb
SET weapon_id = (
  SELECT hr.target_id FROM public.hero_recommendations hr
  WHERE hr.hero_id = hb.hero_id AND hr.recommendation_type = 'weapon'
  ORDER BY hr.sort_order LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.hero_recommendations hr
  WHERE hr.hero_id = hb.hero_id AND hr.recommendation_type = 'weapon'
);

-- Set imprint_id from imprint recommendations
UPDATE public.hero_builds hb
SET imprint_id = (
  SELECT hr.target_id FROM public.hero_recommendations hr
  WHERE hr.hero_id = hb.hero_id AND hr.recommendation_type = 'imprint'
  ORDER BY hr.sort_order LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.hero_recommendations hr
  WHERE hr.hero_id = hb.hero_id AND hr.recommendation_type = 'imprint'
);

-- Migrate synergy recommendations into hero_build_synergies
INSERT INTO public.hero_build_synergies (build_id, hero_id, note, sort_order)
SELECT hb.id, hr.target_id, hr.note, hr.sort_order
FROM public.hero_recommendations hr
JOIN public.hero_builds hb ON hb.hero_id = hr.hero_id
WHERE hr.recommendation_type = 'synergy';

-- 5. Drop hero_recommendations table
DROP TABLE public.hero_recommendations;
