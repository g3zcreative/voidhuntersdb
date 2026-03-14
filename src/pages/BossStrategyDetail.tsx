import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { preprocessMarkup } from "@/lib/guide-markup";
import rehypeRaw from "rehype-raw";

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] || "";
}

export default function BossStrategyDetail() {
  const { bossSlug, strategySlug } = useParams<{ bossSlug: string; strategySlug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["boss_strategy_detail", bossSlug, strategySlug],
    queryFn: async () => {
      const { data: boss } = await (supabase as any)
        .from("bosses")
        .select("id, name, slug, image_url")
        .eq("slug", bossSlug!)
        .maybeSingle();
      if (!boss) return null;

      const { data: strat, error } = await (supabase as any)
        .from("boss_strategies")
        .select("*")
        .eq("boss_id", boss.id)
        .eq("slug", strategySlug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!strat) return null;

      const { data: teamHeroes } = await (supabase as any)
        .from("boss_strategy_heroes")
        .select("*, heroes:hero_id(id, name, slug, image_url, rarity)")
        .eq("strategy_id", strat.id)
        .order("sort_order");

      return { ...strat, boss, teamHeroes: teamHeroes || [] } as any;
    },
    enabled: !!bossSlug && !!strategySlug,
  });

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !data ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Strategy not found</h1>
            <p className="text-muted-foreground">This strategy doesn't exist or isn't published.</p>
          </div>
        ) : (
          <>
            <SEO
              rawTitle={`${data.title} - ${data.boss.name} Strategy | GodforgeHub`}
              description={`${data.title} strategy guide for ${data.boss.name} boss in Godforge.`}
              url={`/bosses/${bossSlug}/strategies/${strategySlug}`}
            />

            <div className="flex items-center gap-2 mb-4">
              <Link to={`/bosses/${data.boss.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">← {data.boss.name}</Link>
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{data.title}</h1>
            <p className="text-muted-foreground mb-8">
              Strategy for <Link to={`/bosses/${data.boss.slug}`} className="text-primary hover:underline">{data.boss.name}</Link>
            </p>

            {data.teamHeroes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Recommended Team
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.teamHeroes.map((sh: any) => (
                    <Link
                      key={sh.id}
                      to={`/database/heroes/${sh.heroes?.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors bg-card"
                    >
                      {sh.heroes?.image_url && (
                        <img src={sh.heroes.image_url} alt={sh.heroes.name} className="h-10 w-10 rounded object-cover border border-border" />
                      )}
                      <div>
                        <p className="font-display font-semibold text-sm">{sh.heroes?.name}</p>
                        {sh.note && <p className="text-xs text-muted-foreground">{sh.note}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.video_url && extractYouTubeId(data.video_url) && (
              <div className="mb-8">
                <div className="aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(data.video_url)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title={data.title}
                  />
                </div>
              </div>
            )}

            {data.content && (
              <div className="prose prose-invert max-w-none [&_.wmde-markdown]:!bg-transparent" data-color-mode="dark">
                <MDEditor.Markdown source={preprocessMarkup(data.content)} rehypePlugins={[rehypeRaw]} />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
