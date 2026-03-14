
CREATE TABLE public.factions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Factions are viewable by everyone" ON public.factions FOR SELECT USING (true);
CREATE POLICY "Admins can insert factions" ON public.factions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update factions" ON public.factions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete factions" ON public.factions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add FK from weapons to factions
ALTER TABLE public.weapons ADD COLUMN faction_id uuid REFERENCES public.factions(id);

-- Trigger for updated_at
CREATE TRIGGER update_factions_updated_at BEFORE UPDATE ON public.factions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
