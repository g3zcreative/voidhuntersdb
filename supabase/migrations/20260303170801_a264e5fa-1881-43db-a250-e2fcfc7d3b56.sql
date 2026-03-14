
-- Timestamp update function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- NEWS ARTICLES
-- ============================================
CREATE TABLE public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'Announcements',
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "News articles are viewable by everyone" ON public.news_articles FOR SELECT USING (published = true);

CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON public.news_articles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- HEROES
-- ============================================
CREATE TABLE public.heroes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  rarity INTEGER NOT NULL CHECK (rarity BETWEEN 1 AND 5),
  element TEXT NOT NULL,
  class_type TEXT NOT NULL,
  description TEXT,
  stats JSONB DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.heroes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Heroes are viewable by everyone" ON public.heroes FOR SELECT USING (true);

CREATE TRIGGER update_heroes_updated_at BEFORE UPDATE ON public.heroes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ITEMS / EQUIPMENT
-- ============================================
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL,
  rarity INTEGER NOT NULL CHECK (rarity BETWEEN 1 AND 5),
  description TEXT,
  stats JSONB DEFAULT '{}',
  obtain_method TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items are viewable by everyone" ON public.items FOR SELECT USING (true);

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SKILLS / ABILITIES
-- ============================================
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  hero_id UUID REFERENCES public.heroes(id) ON DELETE SET NULL,
  skill_type TEXT NOT NULL DEFAULT 'Active',
  description TEXT,
  scaling JSONB DEFAULT '{}',
  cooldown INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills are viewable by everyone" ON public.skills FOR SELECT USING (true);

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- MATERIALS / RESOURCES
-- ============================================
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  material_type TEXT NOT NULL,
  rarity INTEGER NOT NULL CHECK (rarity BETWEEN 1 AND 5),
  description TEXT,
  drop_locations TEXT[],
  usage_info TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials are viewable by everyone" ON public.materials FOR SELECT USING (true);

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- GUIDES
-- ============================================
CREATE TABLE public.guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Beginner',
  author TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published guides are viewable by everyone" ON public.guides FOR SELECT USING (published = true);

CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON public.guides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- OFFICIAL POSTS (Post Tracker)
-- ============================================
CREATE TABLE public.official_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author TEXT NOT NULL,
  author_role TEXT,
  source TEXT NOT NULL DEFAULT 'Discord',
  content TEXT NOT NULL,
  region TEXT,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.official_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Official posts are viewable by everyone" ON public.official_posts FOR SELECT USING (true);

-- ============================================
-- SITE CHANGELOG
-- ============================================
CREATE TABLE public.site_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'improvement',
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Changelog is viewable by everyone" ON public.site_changelog FOR SELECT USING (true);

-- ============================================
-- ROADMAP
-- ============================================
CREATE TABLE public.roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  category TEXT,
  target_date TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roadmap items are viewable by everyone" ON public.roadmap_items FOR SELECT USING (true);

CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON public.roadmap_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
