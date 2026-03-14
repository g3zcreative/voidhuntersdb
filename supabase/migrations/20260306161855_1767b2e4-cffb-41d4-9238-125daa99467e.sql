
-- Create archetypes table
CREATE TABLE public.archetypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon_url text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.archetypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Archetypes are viewable by everyone" ON public.archetypes FOR SELECT USING (true);
CREATE POLICY "Admins can insert archetypes" ON public.archetypes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update archetypes" ON public.archetypes FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete archetypes" ON public.archetypes FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create affinities table
CREATE TABLE public.affinities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon_url text,
  description text,
  strength_id uuid REFERENCES public.affinities(id) ON DELETE SET NULL,
  weakness_id uuid REFERENCES public.affinities(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affinities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affinities are viewable by everyone" ON public.affinities FOR SELECT USING (true);
CREATE POLICY "Admins can insert affinities" ON public.affinities FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update affinities" ON public.affinities FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete affinities" ON public.affinities FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create allegiances table
CREATE TABLE public.allegiances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon_url text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.allegiances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allegiances are viewable by everyone" ON public.allegiances FOR SELECT USING (true);
CREATE POLICY "Admins can insert allegiances" ON public.allegiances FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update allegiances" ON public.allegiances FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete allegiances" ON public.allegiances FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add FK columns to heroes table
ALTER TABLE public.heroes ADD COLUMN faction_id uuid REFERENCES public.factions(id) ON DELETE SET NULL;
ALTER TABLE public.heroes ADD COLUMN archetype_id uuid REFERENCES public.archetypes(id) ON DELETE SET NULL;
ALTER TABLE public.heroes ADD COLUMN affinity_id uuid REFERENCES public.affinities(id) ON DELETE SET NULL;
ALTER TABLE public.heroes ADD COLUMN allegiance_id uuid REFERENCES public.allegiances(id) ON DELETE SET NULL;
