import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Sword, Shield, Zap, Gem, Map, Trophy, Database as DatabaseIcon, Lock, ShieldHalf } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const elementColors: Record<string, string> = {
  Fire: "bg-red-500/10 text-red-400 border-red-500/20",
  Ice: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Wind: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Earth: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Light: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Dark: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const rarityStars = (rarity: number) => "★".repeat(rarity) + "☆".repeat(Math.max(0, 5 - rarity));

const databaseCategories = [
  { id: "heroes", name: "Heroes", description: "All playable heroes", icon: "Shield", href: "/database/heroes" },
  { id: "imprints", name: "Imprints", description: "Hero imprints & passives", icon: "Gem", href: "/database/imprints" },
  { id: "weapons", name: "Weapons", description: "All weapons & factions", icon: "Sword", href: "/database/weapons" },
  { id: "armor-sets", name: "Armor Sets", description: "Set bonuses & gear effects", icon: "ShieldHalf", href: "/database/armor-sets" },
  { id: "skills", name: "Skills", description: "Hero abilities & passives", icon: "Zap", href: "/database/skills" },
  { id: "mechanics", name: "Mechanics", description: "Buffs, debuffs & disables", icon: "Map", href: "/database/mechanics" },
];

const iconMap: Record<string, React.ReactNode> = {
  Sword: <Sword className="h-8 w-8" />,
  Shield: <Shield className="h-8 w-8" />,
  ShieldHalf: <ShieldHalf className="h-8 w-8" />,
  Zap: <Zap className="h-8 w-8" />,
  Gem: <Gem className="h-8 w-8" />,
  Map: <Map className="h-8 w-8" />,
  Trophy: <Trophy className="h-8 w-8" />,
};

const DatabasePage = () => {
  const { data: heroes, isLoading } = useQuery({
    queryKey: ["heroes_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heroes")
        .select("*, factions(name), archetypes(name)")
        .order("rarity", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data || []).map((h: any) => ({
        ...h,
        faction_name: h.factions?.name || "Unknown",
        archetype_name: h.archetypes?.name || "Unknown",
      }));
    },
  });

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
          <DatabaseIcon className="h-7 w-7 text-primary" /> Database
        </h1>
        <p className="text-muted-foreground mb-8">Browse all game data — heroes, equipment, skills, and more.</p>

        {/* Categories grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {databaseCategories.map((cat) => (
              <Link key={cat.id} to={cat.href}>
                <Card className="hover:border-primary/40 transition-all h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="text-primary">{iconMap[cat.icon]}</div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
          ))}
        </div>

        {/* Featured Heroes preview */}
        <h2 className="font-display text-2xl font-bold mb-4">Featured Heroes</h2>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : heroes && heroes.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {heroes.map((hero) => (
              <Link key={hero.id} to={`/database/heroes/${hero.slug}`}>
                <Card className="hover:border-primary/30 transition-colors h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-semibold text-lg">{hero.name}</h3>
                      <span className="text-primary text-sm">{rarityStars(hero.rarity)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={elementColors[hero.faction_name] || ""}>
                        {hero.faction_name}
                      </Badge>
                      <Badge variant="outline">{hero.archetype_name}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No heroes found.</p>
        )}
      </div>
    </Layout>
  );
};

export default DatabasePage;
