import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Users, Crown, Save, Plus, Trash2, Loader2, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import { preprocessMarkup } from "@/lib/guide-markup";
import rehypeRaw from "rehype-raw";

interface SlotState {
  hero_id: string | null;
  weapon_id: string | null;
  imprint_id: string | null;
  armor_set_1_id: string | null;
  armor_set_2_id: string | null;
  armor_set_3_id: string | null;
}

const emptySlot = (): SlotState => ({
  hero_id: null, weapon_id: null, imprint_id: null,
  armor_set_1_id: null, armor_set_2_id: null, armor_set_3_id: null,
});

const NONE_VALUE = "__none__";

export default function TeamBuilder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [title, setTitle] = useState("New Team");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<SlotState[]>(
    Array.from({ length: 5 }, () => emptySlot())
  );

  // Reference data queries
  const { data: heroes = [] } = useQuery({
    queryKey: ["tb_heroes"],
    queryFn: async () => {
      const { data } = await supabase.from("heroes").select("id, name, image_url, rarity, leader_bonus").order("name");
      return data || [];
    },
  });

  const { data: weapons = [] } = useQuery({
    queryKey: ["tb_weapons"],
    queryFn: async () => {
      const { data } = await supabase.from("weapons").select("id, name, image_url, rarity").order("name");
      return data || [];
    },
  });

  const { data: imprints = [] } = useQuery({
    queryKey: ["tb_imprints"],
    queryFn: async () => {
      const { data } = await supabase.from("imprints").select("id, name, image_url, rarity").order("name");
      return data || [];
    },
  });

  const { data: armorSets = [] } = useQuery({
    queryKey: ["tb_armor_sets"],
    queryFn: async () => {
      const { data } = await supabase.from("armor_sets").select("id, name, image_url").order("name");
      return data || [];
    },
  });

  // User's saved teams
  const { data: savedTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["tb_my_teams", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("id, title, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });

  const loadTeam = useCallback(async (teamId: string) => {
    const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (!team) return;
    const { data: slotRows } = await supabase
      .from("team_slots")
      .select("*")
      .eq("team_id", teamId)
      .order("slot_number");

    setActiveTeamId(teamId);
    setTitle(team.title);
    setNotes(team.notes || "");
    const newSlots = Array.from({ length: 5 }, (_, i) => {
      const row = slotRows?.find((s: any) => s.slot_number === i + 1);
      if (!row) return emptySlot();
      return {
        hero_id: row.hero_id,
        weapon_id: row.weapon_id,
        imprint_id: row.imprint_id,
        armor_set_1_id: row.armor_set_1_id,
        armor_set_2_id: row.armor_set_2_id,
        armor_set_3_id: row.armor_set_3_id,
      };
    });
    setSlots(newSlots);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");

      let teamId = activeTeamId;

      if (teamId) {
        await supabase.from("teams").update({ title, notes }).eq("id", teamId);
        await supabase.from("team_slots").delete().eq("team_id", teamId);
      } else {
        const { data, error } = await supabase
          .from("teams")
          .insert({ user_id: user.id, title, notes })
          .select("id")
          .single();
        if (error) throw error;
        teamId = data.id;
      }

      const slotRows = slots.map((s, i) => ({
        team_id: teamId!,
        slot_number: i + 1,
        hero_id: s.hero_id,
        weapon_id: s.weapon_id,
        imprint_id: s.imprint_id,
        armor_set_1_id: s.armor_set_1_id,
        armor_set_2_id: s.armor_set_2_id,
        armor_set_3_id: s.armor_set_3_id,
      }));

      const { error: slotErr } = await supabase.from("team_slots").insert(slotRows);
      if (slotErr) throw slotErr;

      setActiveTeamId(teamId);
      return teamId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tb_my_teams"] });
      toast({ title: "Team saved!" });
    },
    onError: (e: any) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (teamId: string) => {
      await supabase.from("team_slots").delete().eq("team_id", teamId);
      await supabase.from("teams").delete().eq("id", teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tb_my_teams"] });
      if (activeTeamId) newTeam();
      toast({ title: "Team deleted" });
    },
  });

  const newTeam = () => {
    setActiveTeamId(null);
    setTitle("New Team");
    setNotes("");
    setSlots(Array.from({ length: 5 }, () => emptySlot()));
  };

  const updateSlot = (index: number, field: keyof SlotState, value: string | null) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  if (!user) {
    return (
      <Layout>
        <SEO title="Team Builder — GodforgeHub" description="Build and share team compositions." />
        <div className="container py-16 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Team Builder</h1>
          <p className="text-muted-foreground mb-6">Sign in to create and save team compositions.</p>
          <Button asChild>
            <Link to="/auth"><LogIn className="mr-2 h-4 w-4" /> Sign In</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Team Builder — GodforgeHub" description="Build and share team compositions." />
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Team Builder
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newTeam}><Plus className="mr-1 h-4 w-4" /> New</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        {/* Saved teams bar */}
        {savedTeams.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {savedTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTeam(t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  activeTeamId === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Team title..."
          className="text-lg font-display font-semibold max-w-md"
        />

        {/* Hero slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {slots.map((slot, i) => {
            const hero = slot.hero_id ? heroMap.get(slot.hero_id) : null;
            return (
              <Card key={i} className="bg-card/60 border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {i === 0 && <Crown className="h-3.5 w-3.5 text-primary" />}
                    Slot {i + 1} {i === 0 && "· Leader"}
                  </div>

                  {/* Hero portrait */}
                  {hero?.image_url ? (
                    <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted/30 border border-border">
                      <img src={hero.image_url} alt={hero.name} className="w-full h-full object-cover" />
                      {i === 0 && (() => {
                        const lb = hero.leader_bonus as { text?: string; scope?: string } | null;
                        return lb?.text ? (
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent px-2.5 pt-5 pb-2">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Crown className="h-3 w-3 text-primary shrink-0" />
                              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Leader</span>
                            </div>
                            <p className="text-[11px] leading-tight text-foreground/90">{lb.scope ? `(${lb.scope}) ` : ""}{lb.text}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <div className="aspect-[4/5] rounded-lg bg-muted/20 border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                      No hero
                    </div>
                  )}

                  {/* Hero select */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Hero</label>
                    <Select
                      value={slot.hero_id || NONE_VALUE}
                      onValueChange={(v) => updateSlot(i, "hero_id", v === NONE_VALUE ? null : v)}
                    >
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Hero" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                        {heroes.map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Weapon */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Weapon</label>
                    <Select
                      value={slot.weapon_id || NONE_VALUE}
                      onValueChange={(v) => updateSlot(i, "weapon_id", v === NONE_VALUE ? null : v)}
                    >
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Weapon" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                        {weapons.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Imprint */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Imprint</label>
                    <Select
                      value={slot.imprint_id || NONE_VALUE}
                      onValueChange={(v) => updateSlot(i, "imprint_id", v === NONE_VALUE ? null : v)}
                    >
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Imprint" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                        {imprints.map((im) => (
                          <SelectItem key={im.id} value={im.id}>{im.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Armor sets */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Armor Sets</label>
                    {([1, 2, 3] as const).map((n) => {
                      const field = `armor_set_${n}_id` as keyof SlotState;
                      return (
                        <Select
                          key={n}
                          value={(slot[field] as string) || NONE_VALUE}
                          onValueChange={(v) => updateSlot(i, field, v === NONE_VALUE ? null : v)}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder={`Armor Set ${n}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                            {armorSets.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Strategy notes */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">Strategy Notes</h2>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write strategy notes… Supports [hero:slug], [skill:slug] markup."
                className="min-h-[180px] font-mono text-sm"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="prose prose-invert max-w-none rounded-md p-4 border border-border min-h-[180px]">
                {notes ? (
                  <MDEditor.Markdown
                    source={preprocessMarkup(notes)}
                    rehypePlugins={[rehypeRaw]}
                  />
                ) : (
                  <p className="text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete button for active team */}
        {activeTeamId && (
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(activeTeamId)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete Team
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
