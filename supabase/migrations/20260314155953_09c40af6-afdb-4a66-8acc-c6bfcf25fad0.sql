
-- Roles table
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Regions table
CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  image_url TEXT
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Races table
CREATE TABLE public.races (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  image_url TEXT
);
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

-- Archetypes table
CREATE TABLE public.archetypes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  image_url TEXT
);
ALTER TABLE public.archetypes ENABLE ROW LEVEL SECURITY;

-- Hunters table
CREATE TABLE public.hunters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL,
  rarity INTEGER,
  awakening_level INTEGER,
  stats JSONB,
  role_id UUID,
  region_id UUID,
  race_id UUID,
  archetype_id UUID,
  power INTEGER,
  level INTEGER,
  image_url TEXT,
  description TEXT
);
ALTER TABLE public.hunters ENABLE ROW LEVEL SECURITY;

-- FK constraints
ALTER TABLE public.hunters ADD CONSTRAINT fk_hunters_roles FOREIGN KEY (role_id) REFERENCES public.roles(id);
ALTER TABLE public.hunters ADD CONSTRAINT fk_hunters_regions FOREIGN KEY (region_id) REFERENCES public.regions(id);
ALTER TABLE public.hunters ADD CONSTRAINT fk_hunters_races FOREIGN KEY (race_id) REFERENCES public.races(id);
ALTER TABLE public.hunters ADD CONSTRAINT fk_hunters_archetypes FOREIGN KEY (archetype_id) REFERENCES public.archetypes(id);

-- RLS policies: public read, admin write for all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['roles', 'regions', 'races', 'archetypes', 'hunters'])
  LOOP
    EXECUTE format('CREATE POLICY "Public can read %1$s" ON public.%1$I FOR SELECT TO public USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Admins can insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))', tbl);
    EXECUTE format('CREATE POLICY "Admins can update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))', tbl);
    EXECUTE format('CREATE POLICY "Admins can delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role))', tbl);
  END LOOP;
END
$$;

-- Updated_at triggers
CREATE TRIGGER set_updated_at_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_regions BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_races BEFORE UPDATE ON public.races FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_archetypes BEFORE UPDATE ON public.archetypes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_hunters BEFORE UPDATE ON public.hunters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
