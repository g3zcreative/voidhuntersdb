
DROP TABLE IF EXISTS public.page_seo;

CREATE TABLE public.seo_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL UNIQUE,
  title_template text,
  description_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEO templates are viewable by everyone" ON public.seo_templates FOR SELECT USING (true);
CREATE POLICY "Admins can insert seo_templates" ON public.seo_templates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update seo_templates" ON public.seo_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete seo_templates" ON public.seo_templates FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_seo_templates_updated_at BEFORE UPDATE ON public.seo_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
