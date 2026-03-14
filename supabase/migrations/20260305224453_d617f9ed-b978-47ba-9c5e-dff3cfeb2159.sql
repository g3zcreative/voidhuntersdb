
-- Create authors table
CREATE TABLE public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  slug text NOT NULL UNIQUE,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authors are viewable by everyone" ON public.authors FOR SELECT USING (true);
CREATE POLICY "Admins can insert authors" ON public.authors FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update authors" ON public.authors FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete authors" ON public.authors FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial authors
INSERT INTO public.authors (name, role, slug) VALUES
  ('HellHades', 'Admin', 'hellhades'),
  ('Suzi', 'CM', 'suzi'),
  ('Dan (Phixion)', 'Admin', 'dan-phixion');
