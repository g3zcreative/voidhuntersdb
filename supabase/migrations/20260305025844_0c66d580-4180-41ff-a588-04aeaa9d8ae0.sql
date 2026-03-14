
-- Create imprints table
CREATE TABLE public.imprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  passive text,
  source_hero_id uuid REFERENCES public.heroes(id) ON DELETE SET NULL,
  rarity integer NOT NULL DEFAULT 3,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create weapons table
CREATE TABLE public.weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  passive text,
  rank integer NOT NULL DEFAULT 1,
  imprint_id uuid REFERENCES public.imprints(id) ON DELETE SET NULL,
  rarity text NOT NULL DEFAULT 'Rare',
  faction text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.imprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;

-- Imprints RLS
CREATE POLICY "Imprints are viewable by everyone" ON public.imprints FOR SELECT USING (true);
CREATE POLICY "Admins can insert imprints" ON public.imprints FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update imprints" ON public.imprints FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete imprints" ON public.imprints FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Weapons RLS
CREATE POLICY "Weapons are viewable by everyone" ON public.weapons FOR SELECT USING (true);
CREATE POLICY "Admins can insert weapons" ON public.weapons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update weapons" ON public.weapons FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete weapons" ON public.weapons FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_imprints_updated_at BEFORE UPDATE ON public.imprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weapons_updated_at BEFORE UPDATE ON public.weapons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
