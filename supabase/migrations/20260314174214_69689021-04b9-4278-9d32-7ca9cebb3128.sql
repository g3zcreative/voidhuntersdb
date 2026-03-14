CREATE POLICY "Anyone can read deployed entity_definitions"
ON public.entity_definitions
FOR SELECT
TO anon, authenticated
USING (deployed = true);