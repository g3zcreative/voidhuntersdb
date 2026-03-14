-- Add onboarding_complete to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Create user_heroes collection table
CREATE TABLE public.user_heroes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hero_id uuid NOT NULL REFERENCES public.heroes(id) ON DELETE CASCADE,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, hero_id)
);

ALTER TABLE public.user_heroes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own heroes" ON public.user_heroes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own heroes" ON public.user_heroes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own heroes" ON public.user_heroes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all user_heroes" ON public.user_heroes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create user_weapons collection table
CREATE TABLE public.user_weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_id uuid NOT NULL REFERENCES public.weapons(id) ON DELETE CASCADE,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, weapon_id)
);

ALTER TABLE public.user_weapons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weapons" ON public.user_weapons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weapons" ON public.user_weapons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own weapons" ON public.user_weapons FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all user_weapons" ON public.user_weapons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create user_imprints collection table
CREATE TABLE public.user_imprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imprint_id uuid NOT NULL REFERENCES public.imprints(id) ON DELETE CASCADE,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, imprint_id)
);

ALTER TABLE public.user_imprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own imprints" ON public.user_imprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own imprints" ON public.user_imprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own imprints" ON public.user_imprints FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all user_imprints" ON public.user_imprints FOR ALL USING (public.has_role(auth.uid(), 'admin'));