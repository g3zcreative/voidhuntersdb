import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Swords, Stamp, Shield as ShieldIcon, Users } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { preprocessMarkup } from "@/lib/guide-markup";
import rehypeRaw from "rehype-raw";

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] || "";
}

export default function BuildDetail() {
  const { heroSlug, buildSlug } = useParams<{ heroSlug: string; buildSlug: string }>();

  const { data: build, isLoading } = useQuery({
    queryKey: ["build_detail", heroSlug, buildSlug],
    queryFn: async () => {
      // Get hero first
      const { data: hero } = await supabase
        .from("heroes")
        .select("id, name, slug, image_url")
        .eq("slug", heroSlug!)
        .maybeSingle();
      if (!hero) return null;

      const { data: buildData, error } = await supabase
        .from("hero_builds")
        .select("*")
        .eq("hero_id", hero.id)
        .eq("slug", buildSlug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!buildData) return null;

      // Resolve gear + synergies
      const [weaponRes, imprintRes, armorRes, synRes] = await Promise.all([
        buildData.weapon_id ? supabase.from("weapons").select("id, name, slug, image_url, rarity, passive").eq("id", buildData.weapon_id).maybeSingle() : { data: null },
        buildData.imprint_id ? supabase.from("imprints").select("id, name, slug, image_url, rarity, passive").eq("id", buildData.imprint_id).maybeSingle() : { data: null },
        buildData.armor_set_id ? supabase.from("armor_sets").select("id, name, slug, image_url, set_bonus").eq("id", buildData.armor_set_id).maybeSingle() : { data: null },
        supabase.from("hero_build_synergies").select("*, heroes:hero_id(id, name, slug, image_url, rarity)").eq("build_id", buildData.id).order("sort_order"),
      ]);

      return {
        ...buildData,
        hero,
        weapon: weaponRes?.data || null,
        imprint: imprintRes?.data || null,
        armor_set: armorRes?.data || null,
        synergies: (synRes.data || []) as any[],
      };
    },
    enabled: !!heroSlug && !!buildSlug,
  });

  return (
    <Layout>
      <div className="container max-w-5xl py-8">
        <DatabaseBreadcrumb segments={[
          { label: "Heroes", href: "/database/heroes" },
          { label: build?.hero?.name || "...", href: `/database/heroes/${heroSlug}` },
          { label: build?.title || "Build" },
        ]} />

        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !build ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Build not found</h1>
            <p className="text-muted-foreground">This build doesn't exist or isn't published.</p>
          </div>
        ) : (
          <>
            <SEO
              rawTitle={`${build.title} - ${build.hero.name} Build | GodforgeHub`}
              description={`${build.title} build guide for ${build.hero.name} in Godforge.`}
              url={`/database/heroes/${heroSlug}/builds/${buildSlug}`}
            />

            <h1 className="text-3xl md:text-4xl font-display font-bold mt-6 mb-2">{build.title}</h1>
            <p className="text-muted-foreground mb-8">
              Build guide for <Link to={`/database/heroes/${build.hero.slug}`} className="text-primary hover:underline">{build.hero.name}</Link>
            </p>

            {/* Gear Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {build.weapon && (
                <GearCard
                  icon={<Swords className="h-4 w-4 text-primary" />}
                  label="Weapon"
                  item={build.weapon}
                  linkPrefix="/database/weapons"
                  detail={build.weapon.passive}
                />
              )}
              {build.imprint && (
                <GearCard
                  icon={<Stamp className="h-4 w-4 text-primary" />}
                  label="Imprint"
                  item={build.imprint}
                  linkPrefix="/database/imprints"
                  detail={build.imprint.passive}
                />
              )}
              {build.armor_set && (
                <GearCard
                  icon={<ShieldIcon className="h-4 w-4 text-primary" />}
                  label="Armor Set"
                  item={build.armor_set}
                  linkPrefix="/database/armor-sets"
                  detail={build.armor_set.set_bonus}
                />
              )}
            </div>

            {/* Synergies */}
            {build.synergies.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Team Synergies
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {build.synergies.map((s: any) => (
                    <Link
                      key={s.id}
                      to={`/database/heroes/${s.heroes?.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors bg-card group"
                    >
                      {s.heroes?.image_url && (
                        <img src={s.heroes.image_url} alt={s.heroes.name} className="h-10 w-10 rounded object-cover border border-border" />
                      )}
                      <div>
                        <p className="font-display font-semibold text-sm">{s.heroes?.name}</p>
                        {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Video */}
            {build.video_url && extractYouTubeId(build.video_url) && (
              <div className="mb-8">
                <div className="aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(build.video_url)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title={build.title}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            {build.content && (
              <div className="prose prose-invert max-w-none [&_.wmde-markdown]:!bg-transparent" data-color-mode="dark">
                <MDEditor.Markdown source={preprocessMarkup(build.content)} rehypePlugins={[rehypeRaw]} />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function GearCard({ icon, label, item, linkPrefix, detail }: {
  icon: React.ReactNode;
  label: string;
  item: { name: string; slug: string; image_url?: string | null; rarity?: string | number | null };
  linkPrefix: string;
  detail?: string | null;
}) {
  return (
    <Link
      to={`${linkPrefix}/${item.slug}`}
      className="flex items-center gap-3 rounded-lg border border-border p-4 hover:border-primary/30 transition-colors bg-card group"
    >
      {item.image_url && (
        <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded object-cover border border-border group-hover:border-primary/40 transition-colors" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground uppercase font-semibold">{label}</span>
        </div>
        <p className="font-display font-semibold text-sm truncate">{item.name}</p>
        {detail && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{detail}</p>}
      </div>
    </Link>
  );
}
