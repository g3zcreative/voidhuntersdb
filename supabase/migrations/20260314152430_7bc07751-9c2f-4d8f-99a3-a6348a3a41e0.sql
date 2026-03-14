
-- Drop all old game-specific tables in FK-safe order using CASCADE

-- Junction/child tables first
DROP TABLE IF EXISTS public.boss_strategy_heroes CASCADE;
DROP TABLE IF EXISTS public.boss_drops CASCADE;
DROP TABLE IF EXISTS public.boss_skills CASCADE;
DROP TABLE IF EXISTS public.boss_strategies CASCADE;
DROP TABLE IF EXISTS public.hero_build_synergies CASCADE;
DROP TABLE IF EXISTS public.hero_builds CASCADE;
DROP TABLE IF EXISTS public.hero_versions CASCADE;
DROP TABLE IF EXISTS public.sync_diffs CASCADE;
DROP TABLE IF EXISTS public.team_slots CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.user_heroes CASCADE;
DROP TABLE IF EXISTS public.user_weapons CASCADE;
DROP TABLE IF EXISTS public.user_imprints CASCADE;

-- Entity tables
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.weapons CASCADE;
DROP TABLE IF EXISTS public.imprints CASCADE;
DROP TABLE IF EXISTS public.bosses CASCADE;
DROP TABLE IF EXISTS public.heroes CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.mechanics CASCADE;
DROP TABLE IF EXISTS public.armor_sets CASCADE;
DROP TABLE IF EXISTS public.factions CASCADE;
DROP TABLE IF EXISTS public.archetypes CASCADE;
DROP TABLE IF EXISTS public.affinities CASCADE;
DROP TABLE IF EXISTS public.allegiances CASCADE;
