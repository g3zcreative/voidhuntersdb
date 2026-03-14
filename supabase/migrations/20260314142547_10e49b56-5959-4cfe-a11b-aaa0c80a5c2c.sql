
CREATE TABLE public.entity_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Schema',
  schema jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on entity_definitions"
  ON public.entity_definitions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
