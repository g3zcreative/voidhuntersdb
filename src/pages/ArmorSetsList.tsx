import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DatabaseBreadcrumb } from "@/components/DatabaseBreadcrumb";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";



function parseSetBonus(raw: string | null) {
  if (!raw) return [];
  const pieces: { tier: string; text: string }[] = [];
  const regex = /(\d-Piece):\s*([^.]+(?:\.[^0-9])*[^.]*\.?)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    pieces.push({ tier: match[1], text: match[2].trim() });
  }
  if (pieces.length === 0 && raw.trim()) {
    pieces.push({ tier: "", text: raw.trim() });
  }
  return pieces;
}

export default function ArmorSetsList() {
  const [search, setSearch] = useState("");

  const { data: armorSets, isLoading } = useQuery({
    queryKey: ["armor_sets_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("armor_sets")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!armorSets) return [];
    if (!search) return armorSets;
    const q = search.toLowerCase();
    return armorSets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.set_bonus && s.set_bonus.toLowerCase().includes(q))
    );
  }, [armorSets, search]);


  const tierColors: Record<string, string> = {
    "2-Piece": "text-emerald-400",
    "4-Piece": "text-blue-400",
    "6-Piece": "text-amber-400",
  };

  return (
    <Layout>
      <SEO
        title="Armor Sets Database"
        description="Browse all armor sets in Godforge — view set bonuses, icons, and effects."
        url="/database/armor-sets"
      />
      <div className="container py-8">
        <DatabaseBreadcrumb segments={[{ label: "Armor Sets" }]} />
        <h1 className="font-display text-3xl font-bold mb-6">Armor Sets</h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search armor sets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearch("")}
              className="shrink-0"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {filtered.length} armor set{filtered.length !== 1 ? "s" : ""} found
        </p>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((set) => {
              const bonuses = parseSetBonus(set.set_bonus);
              return (
                <Card
                  key={set.id}
                  className="hover:border-primary/30 transition-colors h-full"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {set.image_url ? (
                        <img
                          src={set.image_url}
                          alt={set.name}
                          className="h-12 w-12 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                          ?
                        </div>
                      )}
                      <h3 className="font-display font-semibold text-lg">
                        {set.name}
                      </h3>
                    </div>
                    {bonuses.length > 0 && (
                      <ul className="space-y-1.5">
                        {bonuses.map((b, i) => (
                          <li key={i} className="text-sm leading-snug">
                            {b.tier && (
                              <span
                                className={`font-semibold ${tierColors[b.tier] || "text-muted-foreground"} mr-1`}
                              >
                                {b.tier}:
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              {b.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            No armor sets match your search.
          </p>
        )}

      </div>
    </Layout>
  );
}
