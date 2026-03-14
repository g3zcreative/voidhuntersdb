ALTER TABLE public.heroes
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS affinity text,
  ADD COLUMN IF NOT EXISTS allegiance text,
  ADD COLUMN IF NOT EXISTS realm text,
  ADD COLUMN IF NOT EXISTS lore text;