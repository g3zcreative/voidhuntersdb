import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";
import { SEO } from "@/components/SEO";
import { useSeoTemplate, interpolateTemplate } from "@/hooks/useSeoTemplate";
import { preprocessMarkup } from "@/lib/guide-markup";

const rarityStars = (r: number) => "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));
const rarityLabel = (r: number) => ({ 5: "Legendary", 4: "Epic", 3: "Rare", 2: "Uncommon", 1: "Common" }[r] || `${r}★`);
const rarityLabelColor = (r: number) => ({ 5: "text-orange-400", 4: "text-purple-400", 3: "text-blue-400" }[r] || "text-primary");

export default function ImprintDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tpl } = useSeoTemplate("imprint");

  const { data: imprint, isLoading } = useQuery({
    queryKey: ["imprint", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imprints")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch weapons linked to this imprint
  const { data: weapons } = useQuery({
    queryKey: ["imprint_weapons", imprint?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weapons")
        .select("*")
        .eq("imprint_id", imprint!.id)
        .order("rank");
      if (error) throw error;
      return data;
    },
    enabled: !!imprint?.id,
  });

  const imprintSeoVars = imprint ? { name: imprint.name, rarity: imprint.rarity, rarity_label: rarityLabel(imprint.rarity), passive: imprint.passive } : {};
  const seoTitle = interpolateTemplate(tpl?.title_template, imprintSeoVars);
  const seoDesc = interpolateTemplate(tpl?.description_template, imprintSeoVars);

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <DatabaseBreadcrumb segments={[{ label: "Imprints", href: "/database/imprints" }, { label: imprint?.name || "..." }]} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !imprint ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Imprint not found</h1>
            <p className="text-muted-foreground">This imprint doesn't exist in the database.</p>
          </div>
        ) : (
          <>
            <SEO rawTitle={seoTitle || `${imprint.name} Godforge | GodforgeHub.com`} description={seoDesc || `${imprint.name} Imprint: ${imprint.passive || `${rarityLabel(imprint.rarity)} Imprint in Godforge.`} Read more on GodforgeHub.com, your hub for all things Godforge.`} image={imprint.image_url || undefined} url={`/database/imprints/${imprint.slug}`} />

            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${rarityLabelColor(imprint.rarity)}`}>{rarityLabel(imprint.rarity)}</p>
                <h1 className="text-4xl font-display font-bold mb-1">{imprint.name}</h1>
                <span className="text-primary text-sm block mb-4">{rarityStars(imprint.rarity)}</span>

                {imprint.passive && (
                  <div className="mb-6">
                    <h2 className="text-lg font-display font-semibold mb-2">Passive</h2>
                    <p className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(imprint.passive) }} />
                  </div>
                )}

                {weapons && weapons.length > 0 && (
                  <div>
                    <h2 className="text-lg font-display font-semibold mb-3">Weapons</h2>
                    <div className="space-y-3">
                      {weapons.map((w) => (
                        <Link key={w.id} to={`/database/weapons/${w.slug}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors group">
                          {w.image_url ? (
                            <img src={w.image_url} alt={w.name} className="h-10 w-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h3 className="font-display font-semibold truncate">{w.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{w.rarity}</Badge>
                              <span className="text-xs text-muted-foreground">Rank {w.rank}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {imprint.image_url && (
                <div className="flex-shrink-0 md:w-64 lg:w-80 md:sticky md:top-20 md:self-start">
                  <img src={imprint.image_url} alt={imprint.name} className="w-full" style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
