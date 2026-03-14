import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 24;

const rarityColors: Record<string, string> = {
  Legendary: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Epic: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Rare: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function WeaponsList() {
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [factionFilter, setFactionFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: weapons, isLoading } = useQuery({
    queryKey: ["weapons_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weapons")
        .select("*, factions(name)")
        .order("rank", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: factions = [] } = useQuery({
    queryKey: ["factions_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("factions").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!weapons) return [];
    return weapons.filter((w) => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (rarityFilter !== "all" && w.rarity !== rarityFilter) return false;
      if (factionFilter !== "all" && w.faction_id !== factionFilter) return false;
      return true;
    });
  }, [weapons, search, rarityFilter, factionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasActiveFilters = search || rarityFilter !== "all" || factionFilter !== "all";

  const clearFilters = () => { setSearch(""); setRarityFilter("all"); setFactionFilter("all"); setPage(1); };

  return (
    <Layout>
      <SEO title="Weapons Database" description="Browse all weapons in Godforge — filter by rarity and faction." url="/database/weapons" />
      <div className="container py-8">
        <DatabaseBreadcrumb segments={[{ label: "Weapons" }]} />
        <h1 className="font-display text-3xl font-bold mb-6">Weapons</h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search weapons..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={rarityFilter} onValueChange={(v) => { setRarityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Rarity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              <SelectItem value="Legendary">Legendary</SelectItem>
              <SelectItem value="Epic">Epic</SelectItem>
              <SelectItem value="Rare">Rare</SelectItem>
            </SelectContent>
          </Select>
          <Select value={factionFilter} onValueChange={(v) => { setFactionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Faction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Factions</SelectItem>
              {factions.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0" title="Clear filters"><X className="h-4 w-4" /></Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} weapon{filtered.length !== 1 ? "s" : ""} found</p>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
          </div>
        ) : paged.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paged.map((weapon) => {
              const factionName = (weapon.factions as any)?.name;
              return (
                <Link key={weapon.id} to={`/database/weapons/${weapon.slug}`}>
                  <Card className="hover:border-primary/30 transition-colors h-full group">
                    <CardContent className="p-4 flex items-center gap-3">
                      {weapon.image_url ? (
                        <img src={weapon.image_url} alt={weapon.name} className="h-14 w-14 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">?</div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold truncate">{weapon.name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <Badge variant="outline" className={`text-xs ${rarityColors[weapon.rarity] || ""}`}>{weapon.rarity}</Badge>
                          {factionName && <Badge variant="outline" className="text-xs">{factionName}</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">Rank {weapon.rank}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">No weapons match your filters.</p>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
