
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true);

-- Anyone can view news images
CREATE POLICY "Public read access for news images"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-images');

-- Admins can upload news images
CREATE POLICY "Admins can upload news images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'news-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete news images
CREATE POLICY "Admins can delete news images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'news-images' AND public.has_role(auth.uid(), 'admin'));
