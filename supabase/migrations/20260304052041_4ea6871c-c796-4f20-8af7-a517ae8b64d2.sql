
-- Drop materials table and all its RLS policies
DROP POLICY IF EXISTS "Materials are viewable by everyone" ON public.materials;
DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
DROP TABLE IF EXISTS public.materials;

-- Create mechanics table
CREATE TABLE public.mechanics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  mechanic_type TEXT NOT NULL DEFAULT 'buff',
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Mechanics are viewable by everyone" ON public.mechanics FOR SELECT USING (true);
CREATE POLICY "Admins can insert mechanics" ON public.mechanics FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update mechanics" ON public.mechanics FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete mechanics" ON public.mechanics FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_mechanics_updated_at BEFORE UPDATE ON public.mechanics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
