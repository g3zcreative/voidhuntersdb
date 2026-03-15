
CREATE TABLE public.buffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'buff',
  affected_stats JSONB,
  scaling_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.buffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on buffs" ON public.buffs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read buffs" ON public.buffs FOR SELECT TO anon, authenticated USING (true);
