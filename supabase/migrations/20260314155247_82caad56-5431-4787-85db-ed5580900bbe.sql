
ALTER TABLE public.entity_definitions
  ADD COLUMN IF NOT EXISTS deployed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text;
