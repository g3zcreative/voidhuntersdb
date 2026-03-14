import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Search, X, ChevronLeft, ChevronRight, Plus, Check, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";
import { RosterAnalysis } from "@/components/RosterAnalysis";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 24;

// Keyword synonyms for skill-based searching
const keywordAliases: Record<string, string[]> = {
  "ally attack": ["ally attack", "join attack"],
  "join attack": ["ally attack", "join attack"],
  "counter": ["counter", "counterattack"],
  "counterattack": ["counter", "counterattack"],
  "heal": ["heal", "restore", "recovery"],
  "restore": ["heal", "restore", "recovery"],
  "recovery": ["heal", "restore", "recovery"],
  "shield": ["shield", "barrier"],
  "barrier": ["shield", "barrier"],
  "stun": ["stun", "daze"],
  "daze": ["stun", "daze"],
};

const realmColors: Record<string, string> = {
  Tian: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Aaru: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  Olympus: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Asgard: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Izumo: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Avalon: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Ekur: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Omeyocan: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Vyraj: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  Eternal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const rarityStars = (r: number) => "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));

const rarityOptions = [
  { value: "5", label: "★★★★★ Legendary" },
  { value: "4", label: "★★★★☆ Epic" },
  { value: "3", label: "★★★☆☆ Rare" },
  { value: "2", label: "★★☆☆☆ Uncommon" },
  { value: "1", label: "★☆☆☆☆ Common" },
];

export default function HeroesList() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [realmFilter, setRealmFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addingHeroId, setAddingHeroId] = useState<string | null>(null);

  const { data: heroes, isLoading } = useQuery({
    queryKey: ["heroes_all_with_skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heroes")
        .select("*, factions(name), archetypes(name), skills(name, description, effects)")
        .order("name");
      if (error) throw error;
      return (data || []).map((h: any) => ({
        ...h,
        faction_name: h.factions?.name || "Unknown",
        archetype_name: h.archetypes?.name || "Unknown",
        skills: h.skills || [],
      }));
    },
  });

  // Load reference tables for filter options
  const { data: factionsList = [] } = useQuery({
    queryKey: ["ref_factions_list"],
    queryFn: async () => {
      const { data } = await supabase.from("factions").select("id, name, slug").order("name");
      return (data || []) as { id: string; name: string; slug: string }[];
    },
  });

  // Sync ?faction= URL param to realm filter
  useEffect(() => {
    const factionSlug = searchParams.get("faction");
    if (factionSlug && factionsList.length > 0) {
      const match = factionsList.find(f => f.slug === factionSlug);
      if (match) {
        setRealmFilter(match.name);
        setPage(1);
      }
    }
  }, [searchParams, factionsList]);
  const { data: archetypesList = [] } = useQuery({
    queryKey: ["ref_archetypes_list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("archetypes").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const { data: affinitiesList = [] } = useQuery({
    queryKey: ["ref_affinities_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affinities")
        .select("id, name, slug, strength_id, weakness_id, icon_url")
        .order("name");
      return (data || []) as any[];
    },
  });

  const realms = useMemo(() => {
    if (factionsList.length > 0) return factionsList.map(f => f.name);
    if (!heroes) return [];
    return [...new Set(heroes.map((h: any) => h.faction_name))].filter(Boolean).sort();
  }, [heroes, factionsList]);

  const classes = useMemo(() => {
    if (archetypesList.length > 0) return archetypesList.map(a => a.name);
    if (!heroes) return [];
    return [...new Set(heroes.map((h: any) => h.archetype_name))].filter(Boolean).sort();
  }, [heroes, archetypesList]);

  const filtered = useMemo(() => {
    if (!heroes) return [];
    
    // Expand search terms using keyword aliases
    const searchLower = search.toLowerCase().trim();
    const searchTerms = keywordAliases[searchLower] || (searchLower ? [searchLower] : []);
    
    return heroes.filter((h: any) => {
      // Check standard filters first
      if (realmFilter !== "all" && h.faction_name.toLowerCase() !== realmFilter.toLowerCase()) return false;
      if (classFilter !== "all" && h.archetype_name.toLowerCase() !== classFilter.toLowerCase()) return false;
      if (rarityFilter !== "all" && h.rarity !== Number(rarityFilter)) return false;
      
      // If no search, pass
      if (searchTerms.length === 0) return true;
      
      // Check if any search term matches hero name
      const nameMatch = searchTerms.some(term => h.name.toLowerCase().includes(term));
      if (nameMatch) return true;
      
      // Check if any search term matches skills (name, description, effects)
      const skillMatch = h.skills?.some((skill: any) => {
        return searchTerms.some(term => {
          if (skill.name?.toLowerCase().includes(term)) return true;
          if (skill.description?.toLowerCase().includes(term)) return true;
          // Effects is a JSON array of strings
          if (Array.isArray(skill.effects)) {
            return skill.effects.some((effect: any) => 
              typeof effect === 'string' && effect.toLowerCase().includes(term)
            );
          }
          return false;
        });
      });
      
      return skillMatch;
    });
  }, [heroes, search, realmFilter, classFilter, rarityFilter]);

  // Fetch user's collection to show which heroes are already added
  const { data: userHeroIds = [] } = useQuery({
    queryKey: ["user_heroes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_heroes")
        .select("hero_id")
        .eq("user_id", user.id);
      return (data || []).map((r) => r.hero_id);
    },
    enabled: !!user,
  });

  const addToCollection = async (heroId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setAddingHeroId(heroId);
    try {
      const { error } = await supabase.from("user_heroes").insert({ hero_id: heroId, user_id: user.id });
      if (error) {
        if (error.code === "23505") {
          toast.info("Hero already in your collection");
        } else {
          throw error;
        }
      } else {
        toast.success("Hero added to your collection!");
        queryClient.invalidateQueries({ queryKey: ["user_heroes"] });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add hero");
    } finally {
      setAddingHeroId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const hasActiveFilters = search || realmFilter !== "all" || classFilter !== "all" || rarityFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setRealmFilter("all");
    setClassFilter("all");
    setRarityFilter("all");
    setPage(1);
  };

  return (
    <Layout>
      <SEO title="Heroes Database" description="Browse all heroes in Godforge — filter by realm, class, and rarity." url="/database/heroes" />
      <div className="container py-8">
        <DatabaseBreadcrumb segments={[{ label: "Heroes" }]} />

        <h1 className="font-display text-3xl font-bold mb-6">Heroes</h1>

        {/* Roster Analysis */}
        {heroes && heroes.length > 0 && (
          <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen} className="mb-6">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full">
              <ChevronDown className={`h-4 w-4 transition-transform ${analysisOpen ? "rotate-0" : "-rotate-90"}`} />
              <span className="font-medium">Roster Analysis</span>
              <span className="text-xs text-muted-foreground">— distribution, rarity & affinity insights</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <RosterAnalysis heroes={heroes} affinities={affinitiesList} />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search heroes..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={realmFilter} onValueChange={(v) => { setRealmFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Realm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Realms</SelectItem>
              {realms.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rarityFilter} onValueChange={(v) => { setRarityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Rarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              {rarityOptions.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0" title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} hero{filtered.length !== 1 ? "es" : ""} found</p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : paged.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <TooltipProvider delayDuration={200}>
              {paged.map((hero) => {
                const isOwned = userHeroIds.includes(hero.id);
                return (
                  <Link key={hero.id} to={`/database/heroes/${hero.slug}`}>
                    <Card className="hover:border-primary/30 transition-colors h-full group relative">
                      {user && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => isOwned ? (e.preventDefault(), e.stopPropagation()) : addToCollection(hero.id, e)}
                              className={`absolute top-2 right-2 z-10 h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
                                isOwned
                                  ? "bg-primary/20 text-primary cursor-default"
                                  : "bg-muted/80 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                              }`}
                              disabled={addingHeroId === hero.id}
                            >
                              {isOwned ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {isOwned ? "Already in your collection" : "Add to your collection"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <CardContent className="p-4 flex items-center gap-3">
                        {hero.image_url ? (
                          <div className="h-14 w-14 rounded-lg shrink-0 overflow-hidden">
                            <img
                              src={hero.image_url}
                              alt={hero.name}
                              className="h-full w-full object-cover transition-transform"
                              style={{
                                objectPosition: `${hero.image_focal_x ?? 50}% ${hero.image_focal_y ?? 0}%`,
                                transform: `scale(${hero.image_zoom ?? 1.5})`,
                                transformOrigin: `${hero.image_focal_x ?? 50}% ${hero.image_focal_y ?? 0}%`,
                              }}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">?</div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold truncate">{hero.name}</h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <Badge variant="outline" className={`text-xs ${realmColors[hero.faction_name] || ""}`}>{hero.faction_name}</Badge>
                            <Badge variant="outline" className="text-xs">{hero.archetype_name}</Badge>
                          </div>
                          <span className="text-primary text-xs mt-1 block">{rarityStars(hero.rarity)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </TooltipProvider>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">No heroes match your filters.</p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
