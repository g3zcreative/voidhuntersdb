
ALTER TABLE public.effects ADD COLUMN IF NOT EXISTS affected_stats JSONB;
ALTER TABLE public.effects ADD COLUMN IF NOT EXISTS scaling_info TEXT;

DROP TABLE IF EXISTS public.buffs;
