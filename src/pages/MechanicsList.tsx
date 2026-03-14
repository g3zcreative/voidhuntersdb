import { Layout } from "@/components/layout/Layout";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Search, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";

const typeColors: Record<string, string> = {
  buff: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  debuff: "bg-red-500/10 text-red-400 border-red-500/20",
  disable: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function MechanicsList() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: mechanics, isLoading } = useQuery({
    queryKey: ["mechanics_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mechanics")
        .select("*")
        .order("mechanic_type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!mechanics) return [];
    return mechanics.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || m.mechanic_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [mechanics, search, typeFilter]);

  return (
    <Layout>
      <SEO title="Mechanics Database" description="Browse all spell mechanics — buffs, debuffs, and disables." />
      <div className="container py-8">
        <DatabaseBreadcrumb segments={[{ label: "Mechanics" }]} />
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" /> Mechanics
        </h1>
        <p className="text-muted-foreground mb-6">Browse all buffs, debuffs, and disables.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search mechanics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buff">Buff</SelectItem>
              <SelectItem value="debuff">Debuff</SelectItem>
              <SelectItem value="disable">Disable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((mech) => (
              <Link key={mech.id} to={`/database/mechanics/${mech.slug}`}>
                <Card className="hover:border-primary/30 transition-colors h-full">
                  <CardContent className="p-5 flex items-start gap-4">
                    {mech.icon_url ? (
                      <img src={mech.icon_url} alt={mech.name} className="h-10 w-10 rounded object-contain flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-base mb-1">{mech.name}</h3>
                      <Badge variant="outline" className={typeColors[mech.mechanic_type] || ""}>
                        {mech.mechanic_type}
                      </Badge>
                      {mech.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{mech.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No mechanics found.</p>
        )}
      </div>
    </Layout>
  );
}
