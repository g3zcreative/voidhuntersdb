import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUp, ArrowDown, Minus, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

const ROLES = ["DPS", "Debuff", "Control", "Support", "Sustain"] as const;

const ROLE_ICONS: Record<string, string> = {
  DPS: "🗡️",
  Debuff: "❄️",
  Control: "⚡",
  Support: "⚠️",
  Sustain: "🛡️",
};

const TIER_COLORS: Record<string, string> = {
  T0: "bg-red-500/20 border-red-500 text-red-400",
  "T0.5": "bg-orange-500/20 border-orange-500 text-orange-400",
  T1: "bg-yellow-500/20 border-yellow-500 text-yellow-400",
  "T1.5": "bg-green-500/20 border-green-500 text-green-400",
  T2: "bg-blue-500/20 border-blue-500 text-blue-400",
  T3: "bg-muted/50 border-muted-foreground/30 text-muted-foreground",
};

const TIER_BG: Record<string, string> = {
  T0: "bg-red-500/10",
  "T0.5": "bg-orange-500/10",
  T1: "bg-yellow-500/10",
  "T1.5": "bg-green-500/10",
  T2: "bg-blue-500/10",
  T3: "bg-muted/20",
};

const TIER_BANNER: Record<string, string> = {
  T0: "bg-red-500/80 text-white",
  "T0.5": "bg-orange-500/80 text-white",
  T1: "bg-yellow-500/80 text-black",
  "T1.5": "bg-green-500/80 text-white",
  T2: "bg-blue-500/80 text-white",
  T3: "bg-muted text-muted-foreground",
};

const RARITY_LABELS: Record<number, string> = { 3: "Rare", 4: "Epic", 5: "Legendary" };

function HunterPortrait({ hunter, tags, onClick }: { hunter: any; tags?: string[]; onClick: () => void }) {
  const rarityClass = hunter.rarity === 5 ? "ring-yellow-500" : hunter.rarity === 4 ? "ring-purple-500" : "ring-blue-500";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group w-16 sm:w-20">
      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden ring-2 ${rarityClass} bg-secondary transition-transform group-hover:scale-110`}>
        {hunter.image_url ? (
          <img src={hunter.image_url} alt={hunter.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
            {hunter.name?.slice(0, 2)}
          </div>
        )}
      </div>
      <span className="text-[10px] sm:text-xs text-center leading-tight line-clamp-2 text-foreground/80 group-hover:text-foreground">
        {hunter.name}
      </span>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5">
          {tags.map((t) => (
            <span key={t} className="text-[8px] sm:text-[9px] px-1 py-0 rounded bg-secondary text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function TierList() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<number | null>(null);
  const [activeContext, setActiveContext] = useState<string>("");

  const { data: contexts = [], isLoading: loadingContexts } = useQuery({
    queryKey: ["tier-contexts-public"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_list_contexts").select("*").order("sort_order");
      if (data && data.length > 0 && !activeContext) setActiveContext(data[0].id);
      return data || [];
    },
  });

  const { data: ranges = [] } = useQuery({
    queryKey: ["tier-ranges-public"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_score_ranges").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["tier-entries-public", activeContext],
    queryFn: async () => {
      if (!activeContext) return [];
      const { data } = await supabase
        .from("hunter_tier_entries")
        .select("*, hunters(id, name, image_url, rarity, slug)")
        .eq("context_id", activeContext);
      return data || [];
    },
    enabled: !!activeContext,
  });

  const { data: changelog = [] } = useQuery({
    queryKey: ["tier-changelog-public", activeContext],
    queryFn: async () => {
      if (!activeContext) return [];
      const { data } = await supabase
        .from("tier_list_changelog")
        .select("*, hunters(name, slug, image_url)")
        .eq("context_id", activeContext)
        .order("changed_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!activeContext,
  });

  const filtered = useMemo(() => {
    return entries.filter((e: any) => {
      const hunter = e.hunters;
      if (!hunter) return false;
      if (search && !hunter.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (rarityFilter && hunter.rarity !== rarityFilter) return false;
      return true;
    });
  }, [entries, search, rarityFilter]);

  const tierGroups = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    for (const r of ranges) {
      groups[(r as any).tier] = {};
      for (const role of ROLES) groups[(r as any).tier][role] = [];
    }
    for (const entry of filtered) {
      const tier = (entry as any).tier_override || (entry as any).tier;
      if (!groups[tier]) {
        groups[tier] = {};
        for (const role of ROLES) groups[tier][role] = [];
      }
      const role = (entry as any).role;
      if (groups[tier][role]) {
        groups[tier][role].push(entry);
      }
    }
    return groups;
  }, [filtered, ranges]);

  const orderedTiers = ranges.map((r: any) => r.tier);
  const isLoading = loadingContexts || loadingEntries;

  return (
    <Layout>
      <SEO title="Tier List | VoidHuntersDB" description="Hunter tier list rankings for Void Hunters — find the best hunters for PVE, PVP, and more." />
      <div className="container py-6 space-y-6">
        <h1 className="text-3xl font-display font-bold">Void Hunters Tier List</h1>

        {/* Context Tabs */}
        <div className="flex flex-col sm:flex-row gap-2 overflow-x-auto pb-2">
          {contexts.map((ctx: any) => (
            <button
              key={ctx.id}
              onClick={() => setActiveContext(ctx.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                activeContext === ctx.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {ctx.name}
            </button>
          ))}
        </div>

        {/* Search + Rarity Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hunters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setRarityFilter(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !rarityFilter ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              All
            </button>
            {[5, 4, 3].map((r) => (
              <button
                key={r}
                onClick={() => setRarityFilter(rarityFilter === r ? null : r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rarityFilter === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {RARITY_LABELS[r] || r}
              </button>
            ))}
          </div>
        </div>

        {/* Tier Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No hunters have been scored for this context yet.</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        ) : isMobile ? (
          /* ── Mobile: stacked layout like Prydwen ── */
          <div className="space-y-4">
            {orderedTiers.map((tier: string) => {
              const roleGroups = tierGroups[tier];
              if (!roleGroups) return null;
              const hasEntries = ROLES.some((r) => roleGroups[r]?.length > 0);
              if (!hasEntries && filtered.length > 0) return null;

              const bannerClass = TIER_BANNER[tier] || TIER_BANNER.T3;
              const bgClass = TIER_BG[tier] || TIER_BG.T3;

              return (
                <div key={tier} className={`rounded-lg border border-border overflow-hidden ${bgClass}`}>
                  {/* Tier banner */}
                  <div className={`py-2 text-center font-display font-bold text-lg ${bannerClass}`}>
                    {tier}
                  </div>

                  {/* Role sections */}
                  <div className="divide-y divide-border">
                    {ROLES.map((role) => {
                      const hunters = roleGroups[role] || [];
                      if (hunters.length === 0 && filtered.length > 0) return null;
                      return (
                        <div key={role} className="p-3">
                          <div className="text-xs font-semibold text-center text-muted-foreground mb-2">
                            {ROLE_ICONS[role]} <span className="uppercase">{role}</span>
                          </div>
                          {hunters.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-3">
                              {hunters.map((entry: any) => (
                                <HunterPortrait
                                  key={entry.id}
                                  hunter={entry.hunters}
                                  tags={entry.tags}
                                  onClick={() => navigate(`/database/hunters/${entry.hunters?.slug || entry.hunters?.id}`)}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="h-8" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Desktop: column grid ── */
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-secondary/50 border-b border-border">
              <div className="p-2 text-xs font-semibold text-muted-foreground text-center">TIER</div>
              {ROLES.map((role) => (
                <div key={role} className="p-2 text-xs font-semibold text-center text-muted-foreground border-l border-border">
                  {role}
                </div>
              ))}
            </div>

            {orderedTiers.map((tier: string) => {
              const roleGroups = tierGroups[tier];
              if (!roleGroups) return null;
              const hasEntries = ROLES.some((r) => roleGroups[r]?.length > 0);
              if (!hasEntries && filtered.length > 0) return null;

              const colorClass = TIER_COLORS[tier] || TIER_COLORS.T3;
              const bgClass = TIER_BG[tier] || TIER_BG.T3;

              return (
                <div key={tier} className={`grid grid-cols-[80px_repeat(5,1fr)] border-b border-border last:border-b-0 ${bgClass}`}>
                  <div className={`p-3 flex items-center justify-center border-l-4 ${colorClass}`}>
                    <span className="font-display font-bold text-lg">{tier}</span>
                  </div>
                  {ROLES.map((role) => (
                    <div key={role} className="p-3 border-l border-border flex flex-wrap gap-2 items-start min-h-[80px]">
                      {(roleGroups[role] || []).map((entry: any) => (
                        <HunterPortrait
                          key={entry.id}
                          hunter={entry.hunters}
                          tags={entry.tags}
                          onClick={() => navigate(`/database/hunters/${entry.hunters?.slug || entry.hunters?.id}`)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Changelog */}
        {changelog.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Changes
            </h2>
            <div className="space-y-2">
              {changelog.map((log: any) => {
                const tierChanged = log.old_tier && log.new_tier && log.old_tier !== log.new_tier;
                const scoreUp = log.old_score !== null && log.new_score > log.old_score;
                const scoreDown = log.old_score !== null && log.new_score < log.old_score;
                const isNew = !log.old_tier && !log.old_score;

                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="mt-0.5">
                      {isNew ? (
                        <Badge variant="outline" className="text-xs">NEW</Badge>
                      ) : scoreUp ? (
                        <ArrowUp className="h-4 w-4 text-green-400" />
                      ) : scoreDown ? (
                        <ArrowDown className="h-4 w-4 text-red-400" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <button
                          onClick={() => navigate(`/database/hunters/${log.hunters?.slug || log.hunter_id}`)}
                          className="font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {log.hunters?.name || "Unknown Hunter"}
                        </button>
                        {isNew ? (
                          <span className="text-muted-foreground">added at <Badge variant="secondary" className="text-xs">{log.new_tier}</Badge></span>
                        ) : tierChanged ? (
                          <span className="text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{log.old_tier}</Badge>
                            {" → "}
                            <Badge variant="secondary" className="text-xs">{log.new_tier}</Badge>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">score adjusted ({log.old_score} → {log.new_score})</span>
                        )}
                      </div>
                      {log.note && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{log.note}"</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.changed_at), "MMM d")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
