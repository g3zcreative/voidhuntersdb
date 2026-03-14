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
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";

const ITEMS_PER_PAGE = 24;
const rarityStars = (r: number) => "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));
const rarityOptions = [
  { value: "5", label: "★★★★★ Legendary" },
  { value: "4", label: "★★★★☆ Epic" },
  { value: "3", label: "★★★☆☆ Rare" },
];

export default function ImprintsList() {
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: imprints, isLoading } = useQuery({
    queryKey: ["imprints_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imprints")
        .select("*")
        .order("rarity", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!imprints) return [];
    return imprints.filter((i) => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (rarityFilter !== "all" && i.rarity !== Number(rarityFilter)) return false;
      return true;
    });
  }, [imprints, search, rarityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasActiveFilters = search || rarityFilter !== "all";

  const clearFilters = () => { setSearch(""); setRarityFilter("all"); setPage(1); };

  return (
    <Layout>
      <SEO title="Imprints Database" description="Browse all imprints in Godforge — filter by rarity." url="/database/imprints" />
      <div className="container py-8">
        <DatabaseBreadcrumb segments={[{ label: "Imprints" }]} />
        <h1 className="font-display text-3xl font-bold mb-6">Imprints</h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search imprints..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={rarityFilter} onValueChange={(v) => { setRarityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Rarity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              {rarityOptions.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0" title="Clear filters"><X className="h-4 w-4" /></Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} imprint{filtered.length !== 1 ? "s" : ""} found</p>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
          </div>
        ) : paged.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paged.map((imprint) => (
              <Link key={imprint.id} to={`/database/imprints/${imprint.slug}`}>
                <Card className="hover:border-primary/30 transition-colors h-full group">
                  <CardContent className="p-4 flex items-center gap-3">
                    {imprint.image_url ? (
                      <img src={imprint.image_url} alt={imprint.name} className="h-14 w-14 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">?</div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold truncate">{imprint.name}</h3>
                      <span className="text-primary text-xs mt-1 block">{rarityStars(imprint.rarity)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">No imprints match your filters.</p>
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
