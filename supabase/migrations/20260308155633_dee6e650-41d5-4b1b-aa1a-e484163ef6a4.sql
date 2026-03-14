
-- Bosses table
CREATE TABLE public.bosses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  location text,
  difficulty text DEFAULT 'Normal',
  lore text,
  hp text,
  recommended_level integer,
  affinity_id uuid REFERENCES public.affinities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bosses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bosses are viewable by everyone" ON public.bosses FOR SELECT USING (true);
CREATE POLICY "Admins can insert bosses" ON public.bosses FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bosses" ON public.bosses FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete bosses" ON public.bosses FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Boss skills table
CREATE TABLE public.boss_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id uuid NOT NULL REFERENCES public.bosses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  skill_type text NOT NULL DEFAULT 'Active',
  description text,
  image_url text,
  damage_type text,
  cooldown integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boss_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boss skills are viewable by everyone" ON public.boss_skills FOR SELECT USING (true);
CREATE POLICY "Admins can insert boss_skills" ON public.boss_skills FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update boss_skills" ON public.boss_skills FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete boss_skills" ON public.boss_skills FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Boss strategies (like hero_builds but for bosses)
CREATE TABLE public.boss_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id uuid NOT NULL REFERENCES public.bosses(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  author_id uuid REFERENCES public.profiles(id),
  content text,
  video_url text,
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boss_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published strategies are viewable by everyone" ON public.boss_strategies FOR SELECT USING (published = true);
CREATE POLICY "Admins can view all strategies" ON public.boss_strategies FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert boss_strategies" ON public.boss_strategies FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update boss_strategies" ON public.boss_strategies FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete boss_strategies" ON public.boss_strategies FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own strategies" ON public.boss_strategies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own strategies" ON public.boss_strategies FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own strategies" ON public.boss_strategies FOR DELETE USING (auth.uid() = author_id);

-- Strategy team comp (which heroes to bring)
CREATE TABLE public.boss_strategy_heroes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.boss_strategies(id) ON DELETE CASCADE,
  hero_id uuid NOT NULL REFERENCES public.heroes(id) ON DELETE CASCADE,
  note text,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.boss_strategy_heroes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strategy heroes are viewable by everyone" ON public.boss_strategy_heroes FOR SELECT USING (true);
CREATE POLICY "Admins can insert boss_strategy_heroes" ON public.boss_strategy_heroes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update boss_strategy_heroes" ON public.boss_strategy_heroes FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete boss_strategy_heroes" ON public.boss_strategy_heroes FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Boss drops / loot table
CREATE TABLE public.boss_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id uuid NOT NULL REFERENCES public.bosses(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id),
  weapon_id uuid REFERENCES public.weapons(id),
  armor_set_id uuid REFERENCES public.armor_sets(id),
  drop_rate text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.boss_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boss drops are viewable by everyone" ON public.boss_drops FOR SELECT USING (true);
CREATE POLICY "Admins can insert boss_drops" ON public.boss_drops FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update boss_drops" ON public.boss_drops FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete boss_drops" ON public.boss_drops FOR DELETE USING (has_role(auth.uid(), 'admin'));
