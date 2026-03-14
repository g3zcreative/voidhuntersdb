
-- Add missing fields to heroes table
ALTER TABLE public.heroes
  ADD COLUMN IF NOT EXISTS leader_bonus jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS divinity_generator text,
  ADD COLUMN IF NOT EXISTS ascension_bonuses jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS awakening_bonuses jsonb DEFAULT '[]'::jsonb;

-- Add missing fields to skills table
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS scaling_formula text,
  ADD COLUMN IF NOT EXISTS effects jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS awakening_level integer,
  ADD COLUMN IF NOT EXISTS awakening_bonus text,
  ADD COLUMN IF NOT EXISTS ultimate_cost integer,
  ADD COLUMN IF NOT EXISTS initial_divinity integer;
