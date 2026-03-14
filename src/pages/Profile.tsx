import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sword, Shield, Sparkles, Trash2, Search, BarChart3, ChevronDown } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RosterAnalysis } from "@/components/RosterAnalysis";

type CollectionType = "hero" | "weapon" | "imprint";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analysisOpen, setAnalysisOpen] = useState(false);

  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  // Fetch collections

  const { data: myHeroes = [], isLoading: heroesLoading } = useQuery({
    queryKey: ["user_heroes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_heroes")
        .select("id, source, hero_id, heroes:hero_id(name, slug, image_url, rarity, affinity_id, factions:faction_id(name), archetypes:archetype_id(name))")
        .eq("user_id", user!.id)
        .order("created_at");
      return data || [];
    },
  });

  const { data: affinitiesList = [] } = useQuery({
    queryKey: ["ref_affinities_list"],
    queryFn: async () => {
      const { data } = await supabase.from("affinities").select("*").order("name");
      return data || [];
    },
  });

  const { data: myWeapons = [] } = useQuery({
    queryKey: ["user_weapons", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_weapons")
        .select("id, source, weapon_id, weapons:weapon_id(name, slug, image_url, rarity)")
        .eq("user_id", user!.id)
        .order("created_at");
      return data || [];
    },
  });

  const { data: myImprints = [] } = useQuery({
    queryKey: ["user_imprints", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_imprints")
        .select("id, source, imprint_id, imprints:imprint_id(name, slug, image_url, rarity)")
        .eq("user_id", user!.id)
        .order("created_at");
      return data || [];
    },
  });

  const removeHero = async (id: string) => {
    await supabase.from("user_heroes").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["user_heroes"] });
  };

  const removeWeapon = async (id: string) => {
    await supabase.from("user_weapons").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["user_weapons"] });
  };

  const removeImprint = async (id: string) => {
    await supabase.from("user_imprints").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["user_imprints"] });
  };

  const rarityStars = (r: number) => "★".repeat(r);

  if (authLoading || heroesLoading) {
    return <Layout><div className="container py-16 text-center text-muted-foreground">Loading...</div></Layout>;
  }

  // Redirect to onboarding if user has no heroes
  if (myHeroes.length === 0) {
    navigate("/onboarding");
    return null;
  }

  return (
    <Layout>
      <SEO title="My Collection | GodforgeHub" description="Manage your hero, weapon, and imprint collection." />
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Collection</h1>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="heroes">
          <TabsList>
            <TabsTrigger value="heroes" className="gap-1.5"><Sword className="h-4 w-4" /> Heroes ({myHeroes.length})</TabsTrigger>
            <TabsTrigger value="weapons" className="gap-1.5"><Shield className="h-4 w-4" /> Weapons ({myWeapons.length})</TabsTrigger>
            <TabsTrigger value="imprints" className="gap-1.5"><Sparkles className="h-4 w-4" /> Imprints ({myImprints.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="heroes" className="space-y-4">
            {myHeroes.length >= 2 && (
              <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>My Roster Analysis</span>
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${analysisOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <RosterAnalysis
                    heroes={myHeroes.map((item: any) => ({
                      id: item.hero_id,
                      name: item.heroes?.name || "",
                      rarity: item.heroes?.rarity || 0,
                      faction_name: item.heroes?.factions?.name || "Unknown",
                      archetype_name: item.heroes?.archetypes?.name || "Unknown",
                      affinity_id: item.heroes?.affinity_id,
                    }))}
                    affinities={affinitiesList}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
            <div className="flex justify-end">
              <AddToCollectionDialog type="hero" userId={user!.id} />
            </div>
            {myHeroes.length === 0 ? (
              <EmptyState label="heroes" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {myHeroes.map((item: any) => {
                  const hero = item.heroes;
                  return (
                    <CollectionCard
                      key={item.id}
                      name={hero?.name}
                      image={hero?.image_url}
                      rarity={hero?.rarity}
                      href={`/database/heroes/${hero?.slug}`}
                      source={item.source}
                      onRemove={() => removeHero(item.id)}
                      rarityStars={rarityStars}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="weapons" className="space-y-4">
            <div className="flex justify-end">
              <AddToCollectionDialog type="weapon" userId={user!.id} />
            </div>
            {myWeapons.length === 0 ? (
              <EmptyState label="weapons" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {myWeapons.map((item: any) => {
                  const weapon = item.weapons;
                  return (
                    <CollectionCard
                      key={item.id}
                      name={weapon?.name}
                      image={weapon?.image_url}
                      rarity={0}
                      rarityLabel={weapon?.rarity}
                      href={`/database/weapons/${weapon?.slug}`}
                      source={item.source}
                      onRemove={() => removeWeapon(item.id)}
                      rarityStars={rarityStars}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="imprints" className="space-y-4">
            <div className="flex justify-end">
              <AddToCollectionDialog type="imprint" userId={user!.id} />
            </div>
            {myImprints.length === 0 ? (
              <EmptyState label="imprints" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {myImprints.map((item: any) => {
                  const imprint = item.imprints;
                  return (
                    <CollectionCard
                      key={item.id}
                      name={imprint?.name}
                      image={imprint?.image_url}
                      rarity={imprint?.rarity}
                      href={`/database/imprints/${imprint?.slug}`}
                      source={item.source}
                      onRemove={() => removeImprint(item.id)}
                      rarityStars={rarityStars}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>No {label} in your collection yet.</p>
    </div>
  );
}

function CollectionCard({
  name, image, rarity, rarityLabel, href, source, onRemove, rarityStars,
}: {
  name?: string; image?: string | null; rarity: number; rarityLabel?: string;
  href: string; source?: string; onRemove: () => void; rarityStars: (r: number) => string;
}) {
  return (
    <Card className="group relative overflow-hidden">
      <Link to={href}>
        <div className="aspect-[4/5] bg-muted overflow-hidden">
          {image ? (
            <img src={image} alt={name || ""} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No img</div>
          )}
        </div>
        <div className="p-2 space-y-0.5">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          <p className="text-xs text-primary">{rarity > 0 ? rarityStars(rarity) : rarityLabel}</p>
          {source && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded capitalize">{source.replace("_", " ")}</span>
          )}
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onRemove(); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/90 text-destructive-foreground rounded p-1"
        title="Remove"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </Card>
  );
}

function AddToCollectionDialog({ type, userId }: { type: CollectionType; userId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tableName = type === "hero" ? "heroes" : type === "weapon" ? "weapons" : "imprints";
  const userTable = type === "hero" ? "user_heroes" : type === "weapon" ? "user_weapons" : "user_imprints";
  const fkColumn = type === "hero" ? "hero_id" : type === "weapon" ? "weapon_id" : "imprint_id";

  const { data: results = [] } = useQuery({
    queryKey: [`add_${type}_search`, search],
    enabled: open && search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from(tableName)
        .select("id, name, slug, image_url, rarity")
        .ilike("name", `%${search}%`)
        .limit(20);
      return data || [];
    },
  });

  const handleAdd = async (entityId: string) => {
    setAdding(entityId);
    const { error } = await supabase
      .from(userTable)
      .insert({ user_id: userId, [fkColumn]: entityId, source: "godforge_go" } as any);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already in collection", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} added!` });
      queryClient.invalidateQueries({ queryKey: [`user_${type === "hero" ? "heroes" : type + "s"}`] });
    }
    setAdding(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add {type}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {type} from Godforge Go</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${type}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {search.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
            ) : (
              results.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors"
                >
                  <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-primary">
                      {typeof item.rarity === "number" ? "★".repeat(item.rarity) : item.rarity}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={adding === item.id}
                    onClick={() => handleAdd(item.id)}
                  >
                    {adding === item.id ? "..." : "Add"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
