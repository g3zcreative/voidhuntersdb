import { useParams, Link } from "react-router-dom";
import { preprocessMarkup } from "@/lib/guide-markup";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { useSeoTemplate, interpolateTemplate } from "@/hooks/useSeoTemplate";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";

const skillTypeColors: Record<string, string> = {
  Active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Passive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Ultimate: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Basic: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function SkillDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tpl } = useSeoTemplate("skill");

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*, heroes(name, slug, image_url, rarity, factions(name), archetypes(name))")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const hero = skill?.heroes as any;
  const scaling = skill?.scaling as Record<string, any> | null;

  const skillSeoVars = skill ? { name: skill.name, skill_type: skill.skill_type, description: skill.description } : {};
  const seoTitle = interpolateTemplate(tpl?.title_template, skillSeoVars);
  const seoDesc = interpolateTemplate(tpl?.description_template, skillSeoVars);

  return (
    <Layout>
      <div className="container max-w-3xl py-8">
        <DatabaseBreadcrumb segments={[{ label: "Skills", href: "/database/skills" }, { label: skill?.name || "..." }]} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !skill ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Skill not found</h1>
            <p className="text-muted-foreground">This skill doesn't exist in the database.</p>
          </div>
        ) : (
          <>
            <SEO
              rawTitle={seoTitle || `${skill.name} Godforge | GodforgeHub.com`}
              description={seoDesc || `${skill.name} Skill: ${skill.description || `${skill.skill_type} skill in Godforge.`} Read more on GodforgeHub.com, your hub for all things Godforge.`}
              url={`/database/skills/${skill.slug}`}
            />

            <div className="flex items-center gap-4 mb-6">
              {skill.image_url ? (
                <img src={skill.image_url} alt={skill.name} className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-display font-bold">{skill.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={skillTypeColors[skill.skill_type] || ""}>
                    {skill.skill_type}
                  </Badge>
                </div>
              </div>
            </div>

            {skill.description && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(skill.description) }} />
              </div>
            )}

            {scaling && Object.keys(scaling).length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-semibold mb-3">Scaling</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(scaling).map(([key, val]) => (
                    <div key={key} className="rounded-lg border border-border p-3 text-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{key.replace(/_/g, " ")}</span>
                      <p className="text-lg font-bold text-primary">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hero && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-semibold mb-3">Hero</h2>
                <Link
                  to={`/database/heroes/${hero.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-4 hover:border-primary/30 transition-colors"
                >
                  {hero.image_url && (
                    <img src={hero.image_url} alt={hero.name} className="h-12 w-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <span className="font-display font-semibold" dangerouslySetInnerHTML={{ __html: preprocessMarkup(`[hero:${hero.slug}]`) }} />
                    <p className="text-sm text-muted-foreground">{hero.archetypes?.name || "Unknown"} · {hero.factions?.name || "Unknown"}</p>
                  </div>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
