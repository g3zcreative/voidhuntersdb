import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X, ChevronLeft, ChevronRight, Skull } from "lucide-react";

const ITEMS_PER_PAGE = 24;

const difficultyColors: Record<string, string> = {
  Normal: "bg-green-500/10 text-green-400 border-green-500/20",
  Hard: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Nightmare: "bg-red-500/10 text-red-400 border-red-500/20",
  Legendary: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function BossesList() {
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: bosses, isLoading } = useQuery({
    queryKey: ["bosses_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bosses" as any)
        .select("*, affinities(name)")
        .order("name");
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        affinity_name: b.affinities?.name || null,
      }));
    },
  });

  const difficulties = useMemo(() => {
    if (!bosses) return [];
    return [...new Set(bosses.map((b: any) => b.difficulty).filter(Boolean))].sort();
  }, [bosses]);

  const filtered = useMemo(() => {
    if (!bosses) return [];
    return bosses.filter((b: any) => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (difficultyFilter !== "all" && b.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [bosses, search, difficultyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const hasActiveFilters = search || difficultyFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setDifficultyFilter("all");
    setPage(1);
  };

  return (
    <Layout>
      <SEO title="Bosses | GodforgeHub" description="Browse all bosses in Godforge — view skills, strategies, and loot drops." url="/bosses" />
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Bosses</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bosses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              {difficulties.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0" title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} boss{filtered.length !== 1 ? "es" : ""} found</p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : paged.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paged.map((boss: any) => (
              <Link key={boss.id} to={`/bosses/${boss.slug}`}>
                <Card className="hover:border-primary/30 transition-colors h-full group">
                  <CardContent className="p-4 flex items-center gap-3">
                    {boss.image_url ? (
                      <img
                        src={boss.image_url}
                        alt={boss.name}
                        className="h-14 w-14 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                        <Skull className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold truncate">{boss.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {boss.difficulty && (
                          <Badge variant="outline" className={`text-xs ${difficultyColors[boss.difficulty] || ""}`}>
                            {boss.difficulty}
                          </Badge>
                        )}
                        {boss.location && (
                          <Badge variant="outline" className="text-xs">{boss.location}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">No bosses match your filters.</p>
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
