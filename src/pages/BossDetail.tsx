import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Skull, Zap, Package, Swords, Users, ExternalLink } from "lucide-react";
import { preprocessMarkup } from "@/lib/guide-markup";
import MDEditor from "@uiw/react-md-editor";
import rehypeRaw from "rehype-raw";

const difficultyColors: Record<string, string> = {
  Normal: "bg-green-500/10 text-green-400 border-green-500/20",
  Hard: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Nightmare: "bg-red-500/10 text-red-400 border-red-500/20",
  Legendary: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const skillTypeColors: Record<string, string> = {
  Active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Passive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Ultimate: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Enrage: "bg-red-500/10 text-red-400 border-red-500/20",
};

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] || "";
}

export default function BossDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: boss, isLoading } = useQuery({
    queryKey: ["boss", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bosses")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      let affinity: any = null;
      if (data.affinity_id) {
        const { data: aff } = await supabase.from("affinities").select("name, icon_url").eq("id", data.affinity_id).maybeSingle();
        affinity = aff;
      }

      return { ...data, affinity } as any;
    },
    enabled: !!slug,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["boss_skills", boss?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("boss_skills")
        .select("*")
        .eq("boss_id", boss!.id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!boss?.id,
  });

  const { data: drops = [] } = useQuery({
    queryKey: ["boss_drops", boss?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("boss_drops")
        .select("*")
        .eq("boss_id", boss!.id)
        .order("sort_order");
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const resolved = await Promise.all(data.map(async (drop: any) => {
        let item = null, weapon = null, armor_set = null;
        if (drop.item_id) {
          const { data: d } = await supabase.from("items").select("name, slug, image_url").eq("id", drop.item_id).maybeSingle();
          item = d;
        }
        if (drop.weapon_id) {
          const { data: d } = await supabase.from("weapons").select("name, slug, image_url").eq("id", drop.weapon_id).maybeSingle();
          weapon = d;
        }
        if (drop.armor_set_id) {
          const { data: d } = await supabase.from("armor_sets").select("name, slug, image_url").eq("id", drop.armor_set_id).maybeSingle();
          armor_set = d;
        }
        return { ...drop, item, weapon, armor_set };
      }));
      return resolved;
    },
    enabled: !!boss?.id,
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ["boss_strategies", boss?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("boss_strategies")
        .select("*")
        .eq("boss_id", boss!.id)
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!boss?.id,
  });

  const { data: strategyHeroes = [] } = useQuery({
    queryKey: ["boss_strategy_heroes", strategies.map((s: any) => s.id).join(",")],
    queryFn: async () => {
      const ids = strategies.map((s: any) => s.id);
      if (ids.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("boss_strategy_heroes")
        .select("*, heroes:hero_id(id, name, slug, image_url, rarity)")
        .in("strategy_id", ids)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: strategies.length > 0,
  });

  return (
    <Layout>
      <div className="container max-w-5xl py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !boss ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Boss not found</h1>
            <p className="text-muted-foreground">This boss doesn't exist in the database.</p>
          </div>
        ) : (
          <>
            <SEO
              rawTitle={`${boss.name} Boss Guide | GodforgeHub`}
              description={boss.description || `${boss.name} boss guide — skills, strategies, and loot drops in Godforge.`}
              url={`/bosses/${boss.slug}`}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Link to="/bosses" className="text-sm text-muted-foreground hover:text-primary transition-colors">← Bosses</Link>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">{boss.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {boss.difficulty && (
                    <Badge variant="outline" className={difficultyColors[boss.difficulty] || ""}>{boss.difficulty}</Badge>
                  )}
                  {boss.location && (
                    <Badge variant="outline">{boss.location}</Badge>
                  )}
                  {boss.affinity && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      {boss.affinity.icon_url && <img src={boss.affinity.icon_url} alt="" className="h-3.5 w-3.5" />}
                      {boss.affinity.name}
                    </Badge>
                  )}
                  {boss.recommended_level && (
                    <Badge variant="outline">Lv. {boss.recommended_level}+</Badge>
                  )}
                </div>
                {boss.hp && (
                  <p className="text-sm text-muted-foreground mb-3">HP: <span className="text-foreground font-semibold">{boss.hp}</span></p>
                )}
                {boss.description && (
                  <p className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(boss.description) }} />
                )}
              </div>
              {boss.image_url && (
                <div className="md:w-64 shrink-0">
                  <img src={boss.image_url} alt={boss.name} className="w-full rounded-lg border border-border object-cover" />
                </div>
              )}
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" /> Skills
                </h2>
                <div className="grid gap-3">
                  {skills.map((skill: any) => (
                    <div key={skill.id} className="rounded-lg border border-border p-4 bg-card">
                      <div className="flex items-start gap-3">
                        {skill.image_url ? (
                          <img src={skill.image_url} alt={skill.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-semibold">{skill.name}</h3>
                            <Badge variant="outline" className={`text-xs ${skillTypeColors[skill.skill_type] || ""}`}>
                              {skill.skill_type}
                            </Badge>
                            {skill.damage_type && (
                              <Badge variant="outline" className="text-xs">{skill.damage_type}</Badge>
                            )}
                            {skill.cooldown && (
                              <span className="text-xs text-muted-foreground">CD: {skill.cooldown}s</span>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(skill.description) }} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Loot Drops */}
            {drops.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Loot Drops
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {drops.map((drop: any) => {
                    const entity = drop.item || drop.weapon || drop.armor_set;
                    if (!entity) return null;
                    const linkTo = drop.item
                      ? `/database/items/${entity.slug}`
                      : drop.weapon
                      ? `/database/weapons/${entity.slug}`
                      : "#";
                    return (
                      <Link key={drop.id} to={linkTo} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors bg-card group">
                        {entity.image_url && (
                          <img src={entity.image_url} alt={entity.name} className="h-10 w-10 rounded object-cover border border-border" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-sm truncate">{entity.name}</p>
                          {drop.drop_rate && <p className="text-xs text-muted-foreground">{drop.drop_rate}</p>}
                          {drop.notes && <p className="text-xs text-muted-foreground">{drop.notes}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Strategies */}
            {strategies.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" /> Community Strategies
                </h2>
                <div className="space-y-6">
                  {strategies.map((strat: any) => {
                    const teamHeroes = strategyHeroes.filter((sh: any) => sh.strategy_id === strat.id);
                    return (
                      <div key={strat.id} className="rounded-lg border border-border p-5 bg-card">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-display font-semibold">{strat.title}</h3>
                            {strat.featured && <Badge variant="secondary" className="ml-2 text-xs">Featured</Badge>}
                          </div>
                          <Link
                            to={`/bosses/${boss.slug}/strategies/${strat.slug}`}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Full Guide <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        {teamHeroes.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" /> Recommended Team
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {teamHeroes.map((sh: any) => (
                                <Link
                                  key={sh.id}
                                  to={`/database/heroes/${sh.heroes?.slug}`}
                                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 hover:border-primary/30 transition-colors text-sm"
                                >
                                  {sh.heroes?.image_url && (
                                    <img src={sh.heroes.image_url} alt={sh.heroes.name} className="h-6 w-6 rounded object-cover" />
                                  )}
                                  <span className="font-medium">{sh.heroes?.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {strat.video_url && extractYouTubeId(strat.video_url) && (
                          <div className="mb-4 aspect-video rounded-lg overflow-hidden border border-border">
                            <iframe
                              src={`https://www.youtube.com/embed/${extractYouTubeId(strat.video_url)}`}
                              className="w-full h-full"
                              allowFullScreen
                              title={strat.title}
                            />
                          </div>
                        )}

                        {strat.content && (
                          <div className="prose prose-invert prose-sm max-w-none line-clamp-6 [&_.wmde-markdown]:!bg-transparent" data-color-mode="dark">
                            <MDEditor.Markdown source={preprocessMarkup(strat.content)} rehypePlugins={[rehypeRaw]} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Lore */}
            {boss.lore && (
              <section className="mb-10">
                <h2 className="text-xl font-display font-semibold mb-3">Lore</h2>
                <p className="text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: preprocessMarkup(boss.lore) }} />
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
