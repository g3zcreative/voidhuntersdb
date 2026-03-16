
-- 1. Allow contributors to upload to the images bucket
CREATE POLICY "Contributors can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images' AND has_role(auth.uid(), 'contributor'::app_role));

-- 2. Allow contributors to delete junction table rows (needed for many-to-many save logic)
CREATE POLICY "Contributors can delete hunter_tags"
ON public.hunter_tags FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'contributor'::app_role));

-- 3. Add audit columns to game tables
ALTER TABLE public.hunters ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.effects ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.bosses ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.boss_skills ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
