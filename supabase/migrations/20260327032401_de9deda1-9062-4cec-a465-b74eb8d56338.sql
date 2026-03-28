ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS skill_levels integer,
  ADD COLUMN IF NOT EXISTS max_cd integer,
  ADD COLUMN IF NOT EXISTS skill_tags text,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS hit1_percent numeric,
  ADD COLUMN IF NOT EXISTS hit1_count integer,
  ADD COLUMN IF NOT EXISTS hit1_book_bonus numeric,
  ADD COLUMN IF NOT EXISTS hit2_percent numeric,
  ADD COLUMN IF NOT EXISTS hit2_count integer,
  ADD COLUMN IF NOT EXISTS hit2_book_bonus numeric;