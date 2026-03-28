
-- Allow anyone to read display_name from profiles (for shared tier lists author attribution)
CREATE POLICY "Public can read profile display names" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);
