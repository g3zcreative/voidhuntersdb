
CREATE TABLE public.sync_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id uuid REFERENCES public.heroes(id) ON DELETE CASCADE NOT NULL,
  hero_name text NOT NULL,
  field text NOT NULL,
  entity_type text NOT NULL DEFAULT 'hero',
  entity_id uuid,
  current_value text,
  incoming_value text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  batch_id text NOT NULL
);

ALTER TABLE public.sync_diffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select sync_diffs"
  ON public.sync_diffs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sync_diffs"
  ON public.sync_diffs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sync_diffs"
  ON public.sync_diffs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sync_diffs"
  ON public.sync_diffs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sync_diffs_hero_id ON public.sync_diffs(hero_id);
CREATE INDEX idx_sync_diffs_status ON public.sync_diffs(status);
CREATE INDEX idx_sync_diffs_batch_id ON public.sync_diffs(batch_id);
