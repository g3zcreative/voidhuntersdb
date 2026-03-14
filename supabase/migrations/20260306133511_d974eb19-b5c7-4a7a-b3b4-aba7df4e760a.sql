
-- Hero version history table for full snapshots
CREATE TABLE public.hero_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id uuid NOT NULL REFERENCES public.heroes(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  skills_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  imprints_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_source text NOT NULL DEFAULT 'backfill',
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (hero_id, version_number)
);

ALTER TABLE public.hero_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can view version history
CREATE POLICY "Hero versions are viewable by everyone"
  ON public.hero_versions FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert hero_versions"
  ON public.hero_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete hero_versions"
  ON public.hero_versions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
