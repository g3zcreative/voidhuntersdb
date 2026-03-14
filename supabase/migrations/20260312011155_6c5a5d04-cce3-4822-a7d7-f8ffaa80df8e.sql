CREATE POLICY "Public read access for icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'icons');

CREATE POLICY "Admins can upload icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'icons' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'icons' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'icons' AND has_role(auth.uid(), 'admin'::app_role));