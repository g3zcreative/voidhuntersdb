import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { HunterPortrait } from "@/components/HunterPortrait";
import { ROLES, ROLE_ICONS, TIER_BG, TIER_BANNER, RARITY_LABELS, TIERS } from "@/lib/tier-list-constants";
import { Search, ArrowLeft, Globe, Lock, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Drag data type key
const DRAG_TYPE = "application/x-tier-hunter";

export default function TierListEditor() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>("T0");
  const [selectedRole, setSelectedRole] = useState<string>("DPS");
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Load tier list metadata (always try, so we can redirect non-owners to shared view)
  const { data: tierList, isLoading: loadingList } = useQuery({
    queryKey: ["user-tier-list", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tier_lists")
        .select("*, tier_list_contexts(name)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Load entries
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["user-tier-entries", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tier_entries")
        .select("*, hunters(id, name, image_url, rarity, slug)")
        .eq("tier_list_id", id!);
      return data || [];
    },
    enabled: !!id && !!user,
  });

  // Load all hunters
  const { data: allHunters = [] } = useQuery({
    queryKey: ["all-hunters-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hunters")
        .select("id, name, slug, image_url, rarity")
        .order("name");
      return data || [];
    },
  });

  const placedIds = useMemo(() => new Set(entries.map((e: any) => e.hunter_id)), [entries]);

  const availableHunters = useMemo(() => {
    return allHunters.filter((h: any) => {
      if (placedIds.has(h.id)) return false;
      if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (rarityFilter && h.rarity !== rarityFilter) return false;
      return true;
    });
  }, [allHunters, placedIds, search, rarityFilter]);

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

  // Add hunter to a specific tier/role
  const addMutation = useMutation({
    mutationFn: async ({ hunterId, tier, role }: { hunterId: string; tier: string; role: string }) => {
      const { error } = await supabase.from("user_tier_entries").insert({
        tier_list_id: id!,
        hunter_id: hunterId,
        tier,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-tier-entries", id] });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Move an existing entry to a new tier/role
  const moveMutation = useMutation({
    mutationFn: async ({ entryId, tier, role }: { entryId: string; tier: string; role: string }) => {
      const { error } = await supabase
        .from("user_tier_entries")
        .update({ tier, role })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-tier-entries", id] });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await supabase.from("user_tier_entries").delete().eq("id", entryId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-tier-entries", id] });
    },
  });

  const togglePublic = useMutation({
    mutationFn: async (isPublic: boolean) => {
      await supabase.from("user_tier_lists").update({ is_public: isPublic }).eq("id", id!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-tier-list", id] });
    },
  });

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, hunterId: string, entryId?: string) => {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ hunterId, entryId }));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(targetKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, tier: string, role: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    try {
      const { hunterId, entryId } = JSON.parse(raw);
      if (entryId) {
        // Moving existing entry
        moveMutation.mutate({ entryId, tier, role });
      } else {
        // Adding new hunter from picker
        addMutation.mutate({ hunterId, tier, role });
      }
    } catch {}
  }, [addMutation, moveMutation]);

  // Drop on "remove" zone (hunter picker area)
  const handleDropRemove = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    try {
      const { entryId } = JSON.parse(raw);
      if (entryId) {
        removeMutation.mutate(entryId);
      }
    } catch {}
  }, [removeMutation]);

  const isLoading = loadingList || loadingEntries;

  // If not logged in, redirect to shared view (not auth) so shared links work
  if (!authLoading && !user) {
    navigate(`/tier-list/shared/${id}`, { replace: true });
    return null;
  }

  // If loaded and user is not the owner, redirect to shared view
  if (!isLoading && tierList && tierList.user_id !== user?.id) {
    navigate(`/tier-list/shared/${id}`, { replace: true });
    return null;
  }

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
    // Tier list not found via RLS — could be a public list by another user
    // Try redirecting to shared view
    navigate(`/tier-list/shared/${id}`, { replace: true });
    return null;
  }

  return (
    <Layout>
      <SEO title={`${tierList.name} | VoidHuntersDB`} description="Edit your personal tier list." />
      <div className="container py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/tier-list/my")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">{tierList.name}</h1>
              <p className="text-sm text-muted-foreground">{(tierList as any).tier_list_contexts?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {tierList.is_public ? <Globe className="h-4 w-4 text-green-400" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <Label className="text-sm">{tierList.is_public ? "Public" : "Private"}</Label>
              <Switch
                checked={tierList.is_public}
                onCheckedChange={(v) => togglePublic.mutate(v)}
              />
            </div>
            {tierList.is_public && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/tier-list/shared/${id}`);
                  toast({ title: "Share link copied!" });
                }}
              >
                Share Link
              </Button>
            )}
          </div>
        </div>

        {/* Hunter picker (also drop-to-remove zone) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search hunters..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setRarityFilter(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !rarityFilter ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                All
              </button>
              {[5, 4, 3].map((r) => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(rarityFilter === r ? null : r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    rarityFilter === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {RARITY_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div
            className={`flex flex-wrap gap-2 p-3 rounded-lg border min-h-[80px] max-h-[200px] overflow-y-auto transition-colors ${
              dragOverTarget === "remove"
                ? "border-destructive bg-destructive/10"
                : "border-dashed border-border"
            }`}
            onDragOver={(e) => handleDragOver(e, "remove")}
            onDragLeave={handleDragLeave}
            onDrop={handleDropRemove}
          >
            {availableHunters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {allHunters.length === placedIds.size ? "All hunters placed! Drag a hunter here to remove." : "No hunters match your search."}
              </p>
            ) : (
              availableHunters.map((h: any) => (
                <div
                  key={h.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, h.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <HunterPortrait
                    hunter={h}
                    onClick={() => addMutation.mutate({ hunterId: h.id, tier: selectedTier, role: selectedRole })}
                  />
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Drag hunters into a tier below, or click to place in the selected tier/role.
          </p>

          {/* Click-to-place controls (for click mode) */}
          <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg bg-secondary/50 border border-border">
            <span className="text-sm font-medium text-muted-foreground">Click places in:</span>
            <div className="flex gap-1">
              {TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedTier === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedRole === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {ROLE_ICONS[r]} {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tier Grid with drop zones */}
        <div className="rounded-lg border border-border overflow-hidden">
          {TIERS.map((tier) => {
            const roleGroups = tierGroups[tier];
            if (!roleGroups) return null;

            const bannerClass = TIER_BANNER[tier] || TIER_BANNER.T3;
            const bgClass = TIER_BG[tier] || TIER_BG.T3;

            return (
              <div key={tier} className={`border-b border-border last:border-b-0 ${bgClass}`}>
                <div className={`py-2 px-4 font-display font-bold text-sm ${bannerClass}`}>
                  {tier}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0 divide-x divide-border">
                  {ROLES.map((role) => {
                    const roleEntries = roleGroups[role] || [];
                    const dropKey = `${tier}-${role}`;
                    const isOver = dragOverTarget === dropKey;

                    return (
                      <div
                        key={role}
                        className={`p-2 min-h-[90px] transition-colors ${
                          isOver ? "bg-primary/15 ring-1 ring-inset ring-primary/40" : ""
                        }`}
                        onDragOver={(e) => handleDragOver(e, dropKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, tier, role)}
                      >
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase text-center mb-1">
                          {ROLE_ICONS[role]} {role}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {roleEntries.map((entry: any) => (
                            <div
                              key={entry.id}
                              className="relative group/entry cursor-grab active:cursor-grabbing"
                              draggable
                              onDragStart={(e) => handleDragStart(e, entry.hunter_id, entry.id)}
                            >
                              <HunterPortrait
                                hunter={entry.hunters}
                                onClick={() => removeMutation.mutate(entry.id)}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); removeMutation.mutate(entry.id); }}
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {roleEntries.length === 0 && isOver && (
                          <div className="flex items-center justify-center h-12 text-xs text-primary/60">
                            Drop here
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
