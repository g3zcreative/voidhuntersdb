
CREATE POLICY "Contributors can insert hunters" ON public.hunters FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
CREATE POLICY "Contributors can update hunters" ON public.hunters FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'contributor'::app_role)) WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));

CREATE POLICY "Contributors can insert skills" ON public.skills FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
CREATE POLICY "Contributors can update skills" ON public.skills FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'contributor'::app_role)) WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));

CREATE POLICY "Contributors can insert effects" ON public.effects FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
CREATE POLICY "Contributors can update effects" ON public.effects FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'contributor'::app_role)) WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));

CREATE POLICY "Contributors can insert bosses" ON public.bosses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
CREATE POLICY "Contributors can update bosses" ON public.bosses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'contributor'::app_role)) WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));

CREATE POLICY "Contributors can insert boss_skills" ON public.boss_skills FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
CREATE POLICY "Contributors can update boss_skills" ON public.boss_skills FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'contributor'::app_role)) WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));

CREATE POLICY "Contributors can insert tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
CREATE POLICY "Contributors can update tags" ON public.tags FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'contributor'::app_role)) WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));

CREATE POLICY "Contributors can insert hunter_tags" ON public.hunter_tags FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
CREATE POLICY "Contributors can update hunter_tags" ON public.hunter_tags FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'contributor'::app_role)) WITH CHECK (has_role(auth.uid(), 'contributor'::app_role));
