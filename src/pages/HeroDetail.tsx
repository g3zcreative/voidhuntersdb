import { useParams, Link } from "react-router-dom";
import { preprocessMarkup } from "@/lib/guide-markup";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Zap, Star, History, Swords, Stamp, Users, ExternalLink } from "lucide-react";
import { DatabaseBreadcrumb, DropdownItem } from "@/components/DatabaseBreadcrumb";
import { SEO } from "@/components/SEO";
import { useSeoTemplate, interpolateTemplate } from "@/hooks/useSeoTemplate";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { format } from "date-fns";

const rarityStars = (r: number) => "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));

const rarityLabel = (r: number) => {
  const labels: Record<number, string> = { 5: "Legendary", 4: "Epic", 3: "Rare", 2: "Uncommon", 1: "Common" };
  return labels[r] || `${r}★`;
};

const rarityLabelColor = (r: number) => {
  const colors: Record<number, string> = {
    5: "text-orange-400",
    4: "text-purple-400",
    3: "text-blue-400",
    2: "text-green-400",
    1: "text-gray-400",
  };
  return colors[r] || "text-primary";
};

export default function HeroDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tpl } = useSeoTemplate("hero");

  const { data: hero, isLoading } = useQuery({
    queryKey: ["hero", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heroes")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const [factionRes, archetypeRes, affinityRes, allegianceRes] = await Promise.all([
        data.faction_id ? supabase.from("factions").select("name, icon_url").eq("id", data.faction_id).maybeSingle() : { data: null },
        data.archetype_id ? supabase.from("archetypes").select("name, icon_url").eq("id", data.archetype_id).maybeSingle() : { data: null },
        data.affinity_id ? supabase.from("affinities").select("name, icon_url").eq("id", data.affinity_id).maybeSingle() : { data: null },
        data.allegiance_id ? supabase.from("allegiances").select("name, icon_url").eq("id", data.allegiance_id).maybeSingle() : { data: null },
      ]);

      return {
        ...data,
        faction_name: factionRes?.data?.name || null,
        faction_icon: factionRes?.data?.icon_url || null,
        archetype_name: archetypeRes?.data?.name || null,
        archetype_icon: archetypeRes?.data?.icon_url || null,
        affinity_name: affinityRes?.data?.name || data.affinity,
        affinity_icon: affinityRes?.data?.icon_url || null,
        allegiance_name: allegianceRes?.data?.name || data.allegiance,
        allegiance_icon: allegianceRes?.data?.icon_url || null,
      } as any;
    },
    enabled: !!slug,
  });

  // Fetch all factions for breadcrumb dropdown
  const { data: allFactions } = useQuery({
    queryKey: ["ref_factions_breadcrumb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factions")
        .select("id, name, slug, icon_url")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all heroes in the same faction for breadcrumb dropdown
  const { data: factionHeroes } = useQuery({
    queryKey: ["faction_heroes_breadcrumb", hero?.faction_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heroes")
        .select("name, slug, image_url")
        .eq("faction_id", hero!.faction_id!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!hero?.faction_id,
  });

  const { data: skills } = useQuery({
    queryKey: ["hero_skills", hero?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("hero_id", hero!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!hero?.id,
  });

  const { data: builds } = useQuery({
    queryKey: ["hero_builds", hero?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_builds")
        .select("*")
        .eq("hero_id", hero!.id)
        .eq("published", true)
        .eq("featured", true)
        .order("sort_order");
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Resolve gear for each build
      const enriched = await Promise.all(data.map(async (build: any) => {
        const [wRes, iRes, aRes, sRes] = await Promise.all([
          build.weapon_id ? supabase.from("weapons").select("id, name, slug, image_url, rarity, passive").eq("id", build.weapon_id).maybeSingle() : { data: null },
          build.imprint_id ? supabase.from("imprints").select("id, name, slug, image_url, rarity, passive").eq("id", build.imprint_id).maybeSingle() : { data: null },
          build.armor_set_id ? supabase.from("armor_sets").select("id, name, slug, image_url, set_bonus").eq("id", build.armor_set_id).maybeSingle() : { data: null },
          supabase.from("hero_build_synergies").select("*, heroes:hero_id(id, name, slug, image_url)").eq("build_id", build.id).order("sort_order"),
        ]);
        return {
          ...build,
          weapon: wRes?.data || null,
          imprint: iRes?.data || null,
          armor_set: aRes?.data || null,
          synergies: sRes.data || [],
        };
      }));
      return enriched;
    },
    enabled: !!hero?.id,
  });

  const { data: versions } = useQuery({
    queryKey: ["hero_versions", hero?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_versions")
        .select("id, version_number, change_source, created_at")
        .eq("hero_id", hero!.id)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!hero?.id,
  });

  const [versionOpen, setVersionOpen] = useState(false);

  const leaderBonus = hero?.leader_bonus as { text?: string; scope?: string } | null;
  const ascensionBonuses = (hero?.ascension_bonuses || []) as { tier: number; bonus: string }[];
  const awakeningBonuses = (hero?.awakening_bonuses || []) as { tier: number; bonus: string }[];
  const hasBuilds = (builds?.length || 0) > 0;

  const heroSeoVars = hero ? { name: hero.name, element: hero.faction_name, class_type: hero.archetype_name, faction: hero.faction_name, archetype: hero.archetype_name, rarity: hero.rarity, rarity_label: rarityLabel(hero.rarity), description: hero.description, subtitle: hero.subtitle } : {};
  const seoTitle = interpolateTemplate(tpl?.title_template, heroSeoVars);
  const seoDesc = interpolateTemplate(tpl?.description_template, heroSeoVars);

  // Build breadcrumb segments with dropdowns
  const factionDropdown: DropdownItem[] = (allFactions || []).map((f) => ({
    label: f.name,
    href: `/database/heroes?faction=${f.slug}`,
    iconUrl: f.icon_url,
    active: hero?.faction_id === f.id,
  }));

  const heroDropdown: DropdownItem[] = (factionHeroes || []).map((h) => ({
    label: h.name,
    href: `/database/heroes/${h.slug}`,
    iconUrl: h.image_url,
    active: h.slug === slug,
  }));

  const breadcrumbSegments = [
    { label: "Heroes", href: "/database/heroes" },
    ...(hero?.faction_name
      ? [{
          label: hero.faction_name,
          href: `/database/heroes?faction=${allFactions?.find(f => f.id === hero.faction_id)?.slug || ""}`,
          dropdown: factionDropdown,
        }]
      : []),
    {
      label: hero?.name || "...",
      dropdown: heroDropdown.length > 1 ? heroDropdown : undefined,
    },
  ];

  return (
    <Layout>
      <div className="container max-w-7xl py-8">
        <DatabaseBreadcrumb segments={breadcrumbSegments} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !hero ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-2">Hero not found</h1>
            <p className="text-muted-foreground">This hero doesn't exist in the database.</p>
          </div>
        ) : (
          <>
            <SEO
              rawTitle={seoTitle || `${hero.name} Godforge | GodforgeHub.com`}
              description={seoDesc || `${hero.name} Hero: ${hero.description || `${rarityLabel(hero.rarity)} ${hero.archetype_name} hero in Godforge.`} Read more on GodforgeHub.com, your hub for all things Godforge.`}
              image={hero.image_url || undefined}
              url={`/database/heroes/${hero.slug}`}
              jsonLd={{
                "@context": "https://schema.org",
                "@type": "Thing",
                name: hero.name,
                description: hero.description || `${hero.name} - ${rarityLabel(hero.rarity)} ${hero.archetype_name}`,
                ...(hero.image_url ? { image: hero.image_url } : {}),
                additionalType: "GameCharacter",
              }}
            />

            {/* ===== ABOVE THE FOLD: Two columns ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
              {/* Left Column: Hero Info */}
              <div className="lg:col-span-3 space-y-4">
                <p className={`text-sm font-bold uppercase tracking-widest ${rarityLabelColor(hero.rarity)}`}>
                  {rarityLabel(hero.rarity)} <span className="ml-1">{rarityStars(hero.rarity)}</span>
                </p>
                <h1 className="text-4xl md:text-5xl font-display font-bold">{hero.name}</h1>
                {hero.subtitle && (
                  <p className="text-muted-foreground italic text-lg">— {hero.subtitle} —</p>
                )}

                {/* Attribute Icons Row */}
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-4 py-3">
                    <AttributeIcon
                      label="Faction"
                      name={hero.faction_name}
                      iconUrl={hero.faction_icon}
                    />
                    <AttributeIcon
                      label="Archetype"
                      name={hero.archetype_name}
                      iconUrl={hero.archetype_icon}
                    />
                    {(hero.affinity_name || hero.affinity) && (
                      <AttributeIcon
                        label="Affinity"
                        name={hero.affinity_name || hero.affinity}
                        iconUrl={hero.affinity_icon}
                      />
                    )}
                    {(hero.allegiance_name || hero.allegiance) && (
                      <AttributeIcon
                        label="Allegiance"
                        name={hero.allegiance_name || hero.allegiance}
                        iconUrl={hero.allegiance_icon}
                      />
                    )}
                  </div>
                </TooltipProvider>

                {hero.description && (
                  <p className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(hero.description) }} />
                )}

                {hero.image_url && (
                  <div className="pt-4">
                    <img
                      src={hero.image_url}
                      alt={hero.name}
                      className="max-h-[500px] w-auto mx-auto lg:mx-0"
                      style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }}
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Recommendations or Skills fallback */}
              <div className="lg:col-span-2 space-y-6">
                {hasBuilds ? (
                  <>
                    {builds!.map((build: any) => (
                      <div key={build.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-base font-display font-semibold">{build.title}</h2>
                          <Link
                            to={`/database/heroes/${hero.slug}/builds/${build.slug}`}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Full Guide <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        {build.weapon && (
                          <Link to={`/database/weapons/${build.weapon.slug}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors bg-card group">
                            {build.weapon.image_url && <img src={build.weapon.image_url} alt={build.weapon.name} className="h-10 w-10 rounded object-cover border border-border" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5"><Swords className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase font-semibold">Weapon</span></div>
                              <p className="font-display font-semibold text-sm truncate">{build.weapon.name}</p>
                              {build.weapon.passive && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{build.weapon.passive}</p>}
                            </div>
                          </Link>
                        )}
                        {build.imprint && (
                          <Link to={`/database/imprints/${build.imprint.slug}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors bg-card group">
                            {build.imprint.image_url && <img src={build.imprint.image_url} alt={build.imprint.name} className="h-10 w-10 rounded object-cover border border-border" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5"><Stamp className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase font-semibold">Imprint</span></div>
                              <p className="font-display font-semibold text-sm truncate">{build.imprint.name}</p>
                              {build.imprint.passive && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{build.imprint.passive}</p>}
                            </div>
                          </Link>
                        )}
                        {build.armor_set && (
                          <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
                            {build.armor_set.image_url && <img src={build.armor_set.image_url} alt={build.armor_set.name} className="h-10 w-10 rounded object-cover border border-border" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5"><Shield className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase font-semibold">Armor Set</span></div>
                              <p className="font-display font-semibold text-sm truncate">{build.armor_set.name}</p>
                              {build.armor_set.set_bonus && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{build.armor_set.set_bonus}</p>}
                            </div>
                          </div>
                        )}
                        {build.synergies.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2 flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary" /> Synergies</p>
                            <div className="space-y-2">
                              {build.synergies.map((s: any) => (
                                <Link key={s.id} to={`/database/heroes/${s.heroes?.slug}`} className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary/30 transition-colors bg-card">
                                  {s.heroes?.image_url && <img src={s.heroes.image_url} alt={s.heroes.name} className="h-8 w-8 rounded object-cover border border-border" />}
                                  <div>
                                    <p className="font-display font-semibold text-sm">{s.heroes?.name}</p>
                                    {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {skills && skills.length > 0 && (
                      <div>
                        <h2 className="text-base font-display font-semibold mb-3">Hero Skills</h2>
                        <div className="space-y-3">
                          {skills.map((skill) => (
                            <Link key={skill.id} to={`/database/skills/${skill.slug}`} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors group bg-card">
                              {skill.image_url && (
                                <img src={skill.image_url} alt={skill.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0 border-2 border-border group-hover:border-primary/40 transition-colors" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                  <h3 className="font-display font-bold uppercase tracking-wide text-sm">{skill.name}</h3>
                                  <span className="text-xs text-muted-foreground font-semibold uppercase">({skill.skill_type})</span>
                                </div>
                                {skill.description && <p className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(skill.description) }} />}
                                {skill.awakening_bonus && (
                                  <p className="text-xs text-primary/80 mt-1">
                                    <Star className="inline h-3 w-3 mr-1" />
                                    Awakening {skill.awakening_level || ""}: {skill.awakening_bonus}
                                  </p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {hero.divinity_generator && (
                      <div className="rounded-lg border border-border p-4 bg-card">
                        <div className="flex items-baseline gap-2 mb-1">
                          <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-display font-bold uppercase tracking-wide text-sm">Divinity Generator</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(hero.divinity_generator) }} />
                      </div>
                    )}
                    {leaderBonus?.text && (
                      <div className="rounded-lg border border-border p-4 bg-card">
                        <div className="flex items-baseline gap-2 mb-1">
                          <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-display font-bold uppercase tracking-wide text-sm">Leader Bonus</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{leaderBonus.text}</p>
                        {leaderBonus.scope && <p className="text-xs text-muted-foreground/70 mt-1">{leaderBonus.scope}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ===== BELOW THE FOLD: Masonry-style sections ===== */}
            {/* Skills row first (full width) */}
            {hasBuilds && skills && skills.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-semibold mb-4">Hero Skills</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {skills.map((skill) => (
                      <Link key={skill.id} to={`/database/skills/${skill.slug}`} className="flex items-start gap-3 rounded-lg border border-border p-4 hover:border-primary/30 transition-colors group bg-card">
                        {skill.image_url && (
                          <img src={skill.image_url} alt={skill.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0 border-2 border-border group-hover:border-primary/40 transition-colors" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                            <h3 className="font-display font-bold uppercase tracking-wide text-sm">{skill.name}</h3>
                            <span className="text-xs text-muted-foreground font-semibold uppercase">({skill.skill_type})</span>
                          </div>
                          {skill.scaling_formula && (
                            <span className="text-xs text-primary font-mono block mb-1">{skill.scaling_formula}</span>
                          )}
                          {skill.description && <p className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(skill.description) }} />}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(skill.effects as string[] || []).map((effect: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{effect}</Badge>
                            ))}
                            {skill.ultimate_cost && (
                              <Badge variant="outline" className="text-xs">Cost: {skill.ultimate_cost}</Badge>
                            )}
                          </div>
                          {skill.awakening_bonus && (
                            <p className="text-xs text-primary/80 mt-1">
                              <Star className="inline h-3 w-3 mr-1" />
                              Awakening {skill.awakening_level || ""}: {skill.awakening_bonus}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                    {/* Divinity Generator as a skill-style card */}
                    {hero.divinity_generator && (
                      <div className="rounded-lg border border-border p-4 bg-card">
                        <div className="flex items-baseline gap-2 mb-1">
                          <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-display font-bold uppercase tracking-wide text-sm">Divinity Generator</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessMarkup(hero.divinity_generator) }} />
                      </div>
                    )}
                    {/* Leader Bonus as a skill-style card */}
                    {leaderBonus?.text && (
                      <div className="rounded-lg border border-border p-4 bg-card">
                        <div className="flex items-baseline gap-2 mb-1">
                          <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-display font-bold uppercase tracking-wide text-sm">Leader Bonus</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{leaderBonus.text}</p>
                        {leaderBonus.scope && <p className="text-xs text-muted-foreground/70 mt-1">{leaderBonus.scope}</p>}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Other sections — masonry multi-column layout */}
            <div className="columns-1 md:columns-2 xl:columns-3 2xl:columns-4 gap-6 mb-8 [&>div]:break-inside-avoid [&>div]:mb-6">

              {/* Ascension Bonuses */}
              {ascensionBonuses.length > 0 && (
                <div>
                  <h2 className="text-lg font-display font-semibold mb-3">Ascension Bonuses</h2>
                  <div className="space-y-2">
                    {ascensionBonuses.map((ab) => (
                      <div key={ab.tier} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
                        <span className="text-primary font-bold text-sm w-6">{ab.tier}★</span>
                        <p className="text-sm text-muted-foreground">{ab.bonus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Awakening Bonuses */}
              {awakeningBonuses.length > 0 && (
                <div>
                  <h2 className="text-lg font-display font-semibold mb-3">Awakening Bonuses</h2>
                  <div className="space-y-2">
                    {awakeningBonuses.map((ab) => {
                      const romanNumerals: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };
                      return (
                        <div key={ab.tier} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
                          <span className="text-primary font-bold text-sm w-6">{romanNumerals[ab.tier] || ab.tier}</span>
                          <p className="text-sm text-muted-foreground">{ab.bonus}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lore */}
              {hero.lore && (
                <div>
                  <h2 className="text-lg font-display font-semibold mb-3">Lore</h2>
                  <div className="rounded-lg border border-border p-4 bg-card">
                    <p className="text-sm text-muted-foreground leading-relaxed italic">{hero.lore}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Version History */}
            {versions && versions.length > 0 && (
              <div className="mt-8">
                <Collapsible open={versionOpen} onOpenChange={setVersionOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <History className="h-4 w-4" />
                    <span>Version History ({versions.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="space-y-2 border border-border rounded-lg p-4 bg-card/50">
                      {versions.map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">v{v.version_number}</Badge>
                            <span className="text-muted-foreground capitalize">{v.change_source}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(v.created_at), "MMM d, yyyy HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

/* ── Sub-components ── */

function AttributeIcon({ label, name, iconUrl }: { label: string; name: string; iconUrl?: string | null }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center gap-1 cursor-default">
          <div className="h-12 w-12 rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors">
            {iconUrl ? (
              <img src={iconUrl} alt={name} className="h-8 w-8 object-contain" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground uppercase">{name?.charAt(0)}</span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}