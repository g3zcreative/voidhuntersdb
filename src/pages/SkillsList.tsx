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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { preprocessMarkup } from "@/lib/guide-markup";

const ITEMS_PER_PAGE = 24;

const skillTypeColors: Record<string, string> = {
  Active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Passive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Ultimate: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Basic: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function SkillsList() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [heroFilter, setHeroFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*, heroes(name, slug)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const skillTypes = useMemo(() => {
    if (!skills) return [];
    return [...new Set(skills.map((s) => s.skill_type))].filter(Boolean).sort();
  }, [skills]);

  const heroNames = useMemo(() => {
    if (!skills) return [];
    const names = skills
      .map((s) => (s.heroes as any)?.name)
      .filter(Boolean);
    return [...new Set(names)].sort() as string[];
  }, [skills]);

  const filtered = useMemo(() => {
    if (!skills) return [];
    return skills.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !(s.description || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && s.skill_type.toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (heroFilter !== "all" && (s.heroes as any)?.name !== heroFilter) return false;
      return true;
    });
  }, [skills, search, typeFilter, heroFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const hasActiveFilters = search || typeFilter !== "all" || heroFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setHeroFilter("all");
    setPage(1);
  };

  return (
    <Layout>
      <SEO title="Skills Database" description="Browse all skills in Godforge — filter by type and hero." url="/database/skills" />
      <div className="container py-8">
        <DatabaseBreadcrumb segments={[{ label: "Skills" }]} />

        <h1 className="font-display text-3xl font-bold mb-6 flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" /> Skills
        </h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {skillTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={heroFilter} onValueChange={(v) => { setHeroFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Hero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Heroes</SelectItem>
              {heroNames.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0" title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} skill{filtered.length !== 1 ? "s" : ""} found</p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : paged.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((skill) => {
              const hero = skill.heroes as any;
              return (
                <Link key={skill.id} to={`/database/skills/${skill.slug}`}>
                <Card className="hover:border-primary/30 transition-colors h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-semibold truncate">{skill.name}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-xs ${skillTypeColors[skill.skill_type] || ""}`}>
                          {skill.skill_type}
                        </Badge>
                      </div>
                    </div>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: preprocessMarkup(skill.description) }} />
                    )}
                    {hero?.name && hero?.slug && (
                      <span className="text-xs" dangerouslySetInnerHTML={{ __html: preprocessMarkup(`[hero:${hero.slug}]`) }} />
                    )}
                  </CardContent>
                </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">No skills match your filters.</p>
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
