
-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create team_slots table
CREATE TABLE public.team_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  hero_id uuid REFERENCES public.heroes(id) ON DELETE SET NULL,
  weapon_id uuid REFERENCES public.weapons(id) ON DELETE SET NULL,
  imprint_id uuid REFERENCES public.imprints(id) ON DELETE SET NULL,
  armor_set_1_id uuid REFERENCES public.armor_sets(id) ON DELETE SET NULL,
  armor_set_2_id uuid REFERENCES public.armor_sets(id) ON DELETE SET NULL,
  armor_set_3_id uuid REFERENCES public.armor_sets(id) ON DELETE SET NULL,
  UNIQUE (team_id, slot_number)
);

-- Add updated_at trigger to teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_slots ENABLE ROW LEVEL SECURITY;

-- Teams RLS: users own their teams
CREATE POLICY "Users can view own teams" ON public.teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own teams" ON public.teams FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own teams" ON public.teams FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all teams" ON public.teams FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any team" ON public.teams FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Team slots RLS: access via team ownership
CREATE POLICY "Users can view own team slots" ON public.team_slots FOR SELECT USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_slots.team_id AND teams.user_id = auth.uid()));
CREATE POLICY "Users can insert own team slots" ON public.team_slots FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_slots.team_id AND teams.user_id = auth.uid()));
CREATE POLICY "Users can update own team slots" ON public.team_slots FOR UPDATE USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_slots.team_id AND teams.user_id = auth.uid()));
CREATE POLICY "Users can delete own team slots" ON public.team_slots FOR DELETE USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_slots.team_id AND teams.user_id = auth.uid()));
CREATE POLICY "Admins can view all team slots" ON public.team_slots FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all team slots" ON public.team_slots FOR ALL USING (public.has_role(auth.uid(), 'admin'));
