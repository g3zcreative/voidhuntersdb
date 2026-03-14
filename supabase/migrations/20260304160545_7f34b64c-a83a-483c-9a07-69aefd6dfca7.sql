-- Add image_url column to guides
ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS image_url text;

-- Create guide-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('guide-images', 'guide-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read guide images
CREATE POLICY "Public read access for guide images"
ON storage.objects FOR SELECT
USING (bucket_id = 'guide-images');

-- Allow authenticated admins to upload guide images
CREATE POLICY "Admins can upload guide images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'guide-images'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow authenticated admins to delete guide images
CREATE POLICY "Admins can delete guide images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'guide-images'
  AND public.has_role(auth.uid(), 'admin')
);