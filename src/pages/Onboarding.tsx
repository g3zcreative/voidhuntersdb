import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Sparkles, Swords } from "lucide-react";

const STARTER_SLUGS = ["ramses", "lady-xoc", "guan-yu"];
const ISOLDE_SLUG = "isolde";

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "done">("pick");
  const [saving, setSaving] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Check if already onboarded
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarding_complete) navigate("/profile");
      });
  }, [user, navigate]);

  const { data: starters, isLoading } = useQuery({
    queryKey: ["onboarding_starters"],
    queryFn: async () => {
      const { data } = await supabase
        .from("heroes")
        .select("id, name, slug, image_url, rarity, factions:faction_id(name), archetypes:archetype_id(name), affinities:affinity_id(name)")
        .in("slug", [...STARTER_SLUGS, ISOLDE_SLUG]);
      return data || [];
    },
  });

  const starterHeroes = starters?.filter((h) => STARTER_SLUGS.includes(h.slug)) || [];
  const isolde = starters?.find((h) => h.slug === ISOLDE_SLUG);

  const handleConfirm = async () => {
    if (!selected || !user) return;
    setSaving(true);

    const chosenHero = starterHeroes.find((h) => h.id === selected);
    const inserts = [
      { user_id: user.id, hero_id: selected, source: "starter" },
    ];
    if (isolde) {
      inserts.push({ user_id: user.id, hero_id: isolde.id, source: "starter" });
    }

    const { error } = await supabase.from("user_heroes").insert(inserts);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setStep("done");
    setSaving(false);
  };

  const handleFinish = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);
    navigate("/profile");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const rarityStars = (r: number) => "★".repeat(r);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8">
        {step === "pick" && (
          <>
            <div className="text-center space-y-3">
              <Swords className="h-10 w-10 text-primary mx-auto" />
              <h1 className="font-display text-3xl font-bold text-foreground">Choose Your Starter Hero</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Every player begins their journey with <strong className="text-foreground">Isolde</strong> and one starter hero of their choice. Pick wisely!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {starterHeroes.map((hero) => {
                const isSelected = selected === hero.id;
                const faction = (hero.factions as any)?.name;
                const archetype = (hero.archetypes as any)?.name;
                const affinity = (hero.affinities as any)?.name;

                return (
                  <Card
                    key={hero.id}
                    onClick={() => setSelected(hero.id)}
                    className={`relative cursor-pointer transition-all duration-200 overflow-hidden group ${
                      isSelected
                        ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/20"
                        : "hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 bg-primary rounded-full p-1">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      {hero.image_url ? (
                        <img
                          src={hero.image_url}
                          alt={hero.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-1">
                      <h3 className="font-display font-bold text-lg text-foreground">{hero.name}</h3>
                      <p className="text-xs text-primary font-medium">{rarityStars(hero.rarity)}</p>
                      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {faction && <span className="bg-secondary px-1.5 py-0.5 rounded">{faction}</span>}
                        {archetype && <span className="bg-secondary px-1.5 py-0.5 rounded">{archetype}</span>}
                        {affinity && <span className="bg-secondary px-1.5 py-0.5 rounded">{affinity}</span>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {isolde && (
              <div className="text-center text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Isolde</span> will also be added to your collection automatically.
              </div>
            )}

            <div className="flex justify-center">
              <Button
                size="lg"
                disabled={!selected || saving}
                onClick={handleConfirm}
                className="min-w-[200px]"
              >
                {saving ? "Saving..." : "Confirm Selection"}
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center space-y-6">
            <Sparkles className="h-12 w-12 text-primary mx-auto" />
            <h1 className="font-display text-3xl font-bold text-foreground">Welcome to GodforgeHub!</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your starter heroes have been added to your collection. After completing the <strong className="text-foreground">Godforge Go</strong> minigame, you can add your guaranteed hero, weapon, and imprint from your profile.
            </p>
            <Button size="lg" onClick={handleFinish} className="min-w-[200px]">
              Go to My Collection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
