
CREATE TABLE public.tier_list_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_id uuid NOT NULL,
  context_id uuid NOT NULL,
  old_tier text,
  new_tier text,
  old_score numeric,
  new_score numeric,
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_list_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tier_list_changelog"
  ON public.tier_list_changelog FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can do everything on tier_list_changelog"
  ON public.tier_list_changelog FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
