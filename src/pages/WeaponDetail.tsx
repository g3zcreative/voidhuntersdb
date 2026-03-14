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

const rarityColors: Record<string, string> = {
  Legendary: "text-orange-400",
  Epic: "text-purple-400",
  Rare: "text-blue-400",
};

export default function WeaponDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tpl } = useSeoTemplate("weapon");

  const { data: weapon, isLoading } = useQuery({
    queryKey: ["weapon", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weapons")
        .select("*, factions(name, slug)")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch linked imprint
  const { data: imprint } = useQuery({
    queryKey: ["weapon_imprint", weapon?.imprint_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imprints")
        .select("id, name, slug, image_url")
        .eq("id", weapon!.imprint_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!weapon?.imprint_id,
  });

  const factionName = (weapon?.factions as any)?.name;

  const weaponSeoVars = weapon ? { name: weapon.name, rarity: weapon.rarity, passive: weapon.passive, faction: factionName, rank: weapon.rank } : {};
  const seoTitle = interpolateTemplate(tpl?.title_template, weaponSeoVars);
  const seoDesc = interpolateTemplate(tpl?.description_template, weaponSeoVars);

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <DatabaseBreadcrumb segments={[{ label: "Weapons", href: "/database/weapons" }, { label: weapon?.name || "..." }]} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !weapon ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Weapon not found</h1>
            <p className="text-muted-foreground">This weapon doesn't exist in the database.</p>
          </div>
        ) : (
          <>
            <SEO rawTitle={seoTitle || `${weapon.name} Godforge | GodforgeHub.com`} description={seoDesc || `${weapon.name} Weapon: ${weapon.passive || `${weapon.rarity} Weapon in Godforge.`} Read more on GodforgeHub.com, your hub for all things Godforge.`} image={weapon.image_url || undefined} url={`/database/weapons/${weapon.slug}`} />

            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${rarityColors[weapon.rarity] || "text-primary"}`}>{weapon.rarity}</p>
                <h1 className="text-4xl font-display font-bold mb-1">{weapon.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="outline">Rank {weapon.rank}</Badge>
                  {factionName && <Badge variant="outline">{factionName}</Badge>}
                </div>

                {weapon.passive && (
                  <div className="mb-6">
                    <h2 className="text-lg font-display font-semibold mb-2">Passive</h2>
                    <p className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(weapon.passive) }} />
                  </div>
                )}

                {imprint && (
                  <div>
                    <h2 className="text-lg font-display font-semibold mb-3">Imprint</h2>
                    <Link to={`/database/imprints/${imprint.slug}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
                      {imprint.image_url ? (
                        <img src={imprint.image_url} alt={imprint.name} className="h-10 w-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted shrink-0" />
                      )}
                      <span className="font-display font-semibold">{imprint.name}</span>
                    </Link>
                  </div>
                )}
              </div>

              {weapon.image_url && (
                <div className="flex-shrink-0 md:w-64 lg:w-80 md:sticky md:top-20 md:self-start">
                  <img src={weapon.image_url} alt={weapon.name} className="w-full" style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
