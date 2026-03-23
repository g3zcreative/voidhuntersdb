import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HunterPortrait } from "@/components/HunterPortrait";
import { ROLES, ROLE_ICONS, TIER_COLORS, TIER_BG, TIER_BANNER, TIERS } from "@/lib/tier-list-constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function SharedTierList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: tierList, isLoading: loadingList } = useQuery({
    queryKey: ["shared-tier-list", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tier_lists")
        .select("*, tier_list_contexts(name)")
        .eq("id", id!)
        .eq("is_public", true)
        .single();
      if (!data) return null;
      // Fetch author profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", data.user_id)
        .single();
      return { ...data, profile };
    },
    enabled: !!id,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["shared-tier-entries", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tier_entries")
        .select("*, hunters(id, name, image_url, rarity, slug)")
        .eq("tier_list_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const tierGroups = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    for (const tier of TIERS) {
      groups[tier] = {};
      for (const role of ROLES) groups[tier][role] = [];
    }
    for (const entry of entries) {
      const tier = (entry as any).tier;
      const role = (entry as any).role;
      if (groups[tier]?.[role]) {
        groups[tier][role].push(entry);
      }
    }
    return groups;
  }, [entries]);

  const isLoading = loadingList || loadingEntries;
  const authorName = (tierList as any)?.profiles?.display_name || (tierList as any)?.profiles?.email?.split("@")[0] || "Anonymous";

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!tierList) {
    return (
      <Layout>
        <div className="container py-16 text-center text-muted-foreground">
          <p className="text-lg">This tier list doesn't exist or isn't public.</p>
          <Button className="mt-4" onClick={() => navigate("/tier-list")}>View Official Tier List</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={`${tierList.name} by ${authorName} | VoidHuntersDB`}
        description={`Custom Void Hunters tier list by ${authorName} — ${(tierList as any).tier_list_contexts?.name}`}
      />
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold">{tierList.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>by <strong className="text-foreground">{authorName}</strong></span>
            <span>•</span>
            <span>{(tierList as any).tier_list_contexts?.name}</span>
            <span>•</span>
            <span>{format(new Date(tierList.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-display font-bold text-lg">Create Your Own Tier List!</p>
            <p className="text-sm text-muted-foreground">Build and share your personal Void Hunters rankings.</p>
          </div>
          <Button onClick={() => navigate(user ? "/tier-list/my" : "/auth")} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            {user ? "Create Tier List" : "Sign In to Create"}
          </Button>
        </div>

        {/* Tier Grid */}
        <div className="rounded-lg border border-border overflow-hidden">
          {isMobile ? (
            <div className="space-y-0">
              {TIERS.map((tier) => {
                const roleGroups = tierGroups[tier];
                if (!roleGroups) return null;
                const hasEntries = ROLES.some((r) => roleGroups[r]?.length > 0);
                if (!hasEntries) return null;

                return (
                  <div key={tier} className={`border-b border-border last:border-b-0 ${TIER_BG[tier] || TIER_BG.T3}`}>
                    <div className={`py-2 text-center font-display font-bold text-lg ${TIER_BANNER[tier] || TIER_BANNER.T3}`}>
                      {tier}
                    </div>
                    <div className="divide-y divide-border">
                      {ROLES.map((role) => {
                        const hunters = roleGroups[role] || [];
                        if (hunters.length === 0) return null;
                        return (
                          <div key={role} className="p-3">
                            <div className="text-xs font-semibold text-center text-muted-foreground mb-2">
                              {ROLE_ICONS[role]} <span className="uppercase">{role}</span>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3">
                              {hunters.map((entry: any) => (
                                <HunterPortrait
                                  key={entry.id}
                                  hunter={entry.hunters}
                                  onClick={() => navigate(`/database/hunters/${entry.hunters?.slug}`)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-secondary/50 border-b border-border">
                <div className="p-2 text-xs font-semibold text-muted-foreground text-center">TIER</div>
                {ROLES.map((role) => (
                  <div key={role} className="p-2 text-xs font-semibold text-center text-muted-foreground border-l border-border">
                    {role}
                  </div>
                ))}
              </div>
              {TIERS.map((tier) => {
                const roleGroups = tierGroups[tier];
                if (!roleGroups) return null;
                const hasEntries = ROLES.some((r) => roleGroups[r]?.length > 0);
                if (!hasEntries) return null;

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
                            onClick={() => navigate(`/database/hunters/${entry.hunters?.slug}`)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-6">
          <Button onClick={() => navigate(user ? "/tier-list/my" : "/auth")} size="lg" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Your Own Tier List
          </Button>
        </div>
      </div>
    </Layout>
  );
}
