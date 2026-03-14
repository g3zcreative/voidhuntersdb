
CREATE TABLE public.hero_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id uuid NOT NULL REFERENCES public.heroes(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  target_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hero_id, recommendation_type, target_id)
);

ALTER TABLE public.hero_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hero recommendations are viewable by everyone"
  ON public.hero_recommendations FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert hero_recommendations"
  ON public.hero_recommendations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update hero_recommendations"
  ON public.hero_recommendations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hero_recommendations"
  ON public.hero_recommendations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
