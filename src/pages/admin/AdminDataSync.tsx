import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, Check, X, Play, Square, Eye, Trash2 } from "lucide-react";

type SyncDiff = {
  id: string;
  hero_id: string;
  hero_name: string;
  field: string;
  entity_type: string;
  entity_id: string | null;
  current_value: string | null;
  incoming_value: string | null;
  status: string;
  batch_id: string;
  created_at: string;
  reviewed_at: string | null;
};

export default function AdminDataSync() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [heroFilter, setHeroFilter] = useState("all");
  const [selectedHeroId, setSelectedHeroId] = useState("");
  const [viewDiff, setViewDiff] = useState<SyncDiff | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, name: "" });
  const stopRef = useRef(false);

  // Fetch heroes for dropdown
  const { data: heroes = [] } = useQuery({
    queryKey: ["admin_heroes_sync"],
    queryFn: async () => {
      const { data } = await supabase
        .from("heroes")
        .select("id, name, slug, faction_id, factions:faction_id(name)")
        .order("name");
      return (data || []) as any[];
    },
  });

  // Fetch diffs
  const { data: diffs = [], isLoading } = useQuery({
    queryKey: ["sync_diffs", statusFilter, heroFilter],
    queryFn: async () => {
      let q = supabase
        .from("sync_diffs")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (heroFilter !== "all") q = q.eq("hero_id", heroFilter);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SyncDiff[];
    },
  });

  // Sync single hero
  const syncHero = async (heroId: string) => {
    const hero = heroes.find((h: any) => h.id === heroId);
    if (!hero) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-hero", {
        body: {
          hero_id: hero.id,
          slug: hero.slug,
          faction_name: hero.factions?.name || "",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${hero.name}: ${data.diffs_found} differences found`);
      qc.invalidateQueries({ queryKey: ["sync_diffs"] });
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Bulk sync all heroes
  const startBulkSync = async () => {
    stopRef.current = false;
    setBulkSyncing(true);
    setBulkProgress({ current: 0, total: heroes.length, name: "" });

    let totalDiffs = 0;
    for (let i = 0; i < heroes.length; i++) {
      if (stopRef.current) break;
      const hero = heroes[i];
      setBulkProgress({ current: i + 1, total: heroes.length, name: hero.name });

      try {
        const { data, error } = await supabase.functions.invoke("sync-hero", {
          body: {
            hero_id: hero.id,
            slug: hero.slug,
            faction_name: hero.factions?.name || "",
          },
        });
        if (data?.diffs_found) totalDiffs += data.diffs_found;
        if (error || data?.error) {
          console.error(`Sync failed for ${hero.name}:`, error || data?.error);
        }
      } catch (e) {
        console.error(`Sync error for ${hero.name}:`, e);
      }

      // Rate limit delay
      if (i < heroes.length - 1 && !stopRef.current) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    setBulkSyncing(false);
    toast.success(`Bulk sync complete: ${totalDiffs} total differences found`);
    qc.invalidateQueries({ queryKey: ["sync_diffs"] });
  };

  // Accept a diff
  const acceptMutation = useMutation({
    mutationFn: async (diff: SyncDiff) => {
      // Apply the change to the relevant table
      const incoming = diff.incoming_value ? JSON.parse(diff.incoming_value) : null;

      if (diff.entity_type === "hero") {
        if (diff.field.startsWith("stats.")) {
          // Single stat key update
          const statKey = diff.field.replace("stats.", "");
          const { data: hero } = await supabase
            .from("heroes")
            .select("stats")
            .eq("id", diff.hero_id)
            .single();
          const currentStats = (hero?.stats || {}) as Record<string, any>;
          currentStats[statKey] = incoming;
          const { error } = await supabase
            .from("heroes")
            .update({ stats: currentStats as any })
            .eq("id", diff.hero_id);
          if (error) throw error;
        } else if (diff.field === "affinity" || diff.field === "allegiance") {
          // Also resolve the FK ID
          const table = diff.field === "affinity" ? "affinities" : "allegiances";
          const fkField = `${diff.field}_id`;
          const { data: ref } = await supabase
            .from(table)
            .select("id")
            .ilike("name", incoming)
            .maybeSingle();
          const update: Record<string, unknown> = { [diff.field]: incoming };
          if (ref) update[fkField] = ref.id;
          const { error } = await supabase
            .from("heroes")
            .update(update)
            .eq("id", diff.hero_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("heroes")
            .update({ [diff.field]: incoming })
            .eq("id", diff.hero_id);
          if (error) throw error;
        }
      } else if (diff.entity_type === "skill" && diff.entity_id) {
        const fieldKey = diff.field.split(".").pop()!;
        const { error } = await supabase
          .from("skills")
          .update({ [fieldKey]: incoming })
          .eq("id", diff.entity_id);
        if (error) throw error;
      } else if (diff.entity_type === "imprint" && diff.entity_id) {
        const { error } = await supabase
          .from("imprints")
          .update({ passive: incoming })
          .eq("id", diff.entity_id);
        if (error) throw error;
      }

      // Mark as accepted
      const { error: updateError } = await supabase
        .from("sync_diffs")
        .update({ status: "accepted", reviewed_at: new Date().toISOString() })
        .eq("id", diff.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Change accepted and applied");
      qc.invalidateQueries({ queryKey: ["sync_diffs"] });
    },
    onError: (e: any) => toast.error(`Accept failed: ${e.message}`),
  });

  // Reject a diff
  const rejectMutation = useMutation({
    mutationFn: async (diffId: string) => {
      const { error } = await supabase
        .from("sync_diffs")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", diffId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Change rejected");
      qc.invalidateQueries({ queryKey: ["sync_diffs"] });
    },
  });

  // Bulk accept/reject all pending for a hero
  const bulkAction = async (action: "accepted" | "rejected", heroId?: string) => {
    let q = supabase
      .from("sync_diffs")
      .update({ status: action, reviewed_at: new Date().toISOString() })
      .eq("status", "pending");
    if (heroId) q = q.eq("hero_id", heroId);
    const { error } = await q;
    if (error) {
      toast.error(`Bulk ${action} failed: ${error.message}`);
    } else {
      toast.success(`All pending diffs ${action}`);
      qc.invalidateQueries({ queryKey: ["sync_diffs"] });
    }
  };

  // Clear resolved diffs
  const clearResolved = async () => {
    const { error } = await supabase
      .from("sync_diffs")
      .delete()
      .in("status", ["accepted", "rejected"]);
    if (error) toast.error(error.message);
    else {
      toast.success("Cleared resolved diffs");
      qc.invalidateQueries({ queryKey: ["sync_diffs"] });
    }
  };

  const pendingCount = diffs.filter((d) => d.status === "pending").length;
  const uniqueHeroes = [...new Set(diffs.map((d) => d.hero_name))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Data Sync</h1>
          <p className="text-sm text-muted-foreground">
            Compare hero data with godforge.gg and review differences
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Sync Controls */}
      <div className="flex flex-wrap gap-4 items-end border border-border rounded-lg p-4 bg-card">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sync Single Hero</label>
          <div className="flex gap-2">
            <Select value={selectedHeroId} onValueChange={setSelectedHeroId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select hero..." />
              </SelectTrigger>
              <SelectContent>
                {heroes.map((h: any) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => syncHero(selectedHeroId)}
              disabled={!selectedHeroId || syncing || bulkSyncing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Bulk Sync</label>
          <div className="flex gap-2">
            {!bulkSyncing ? (
              <Button size="sm" variant="outline" onClick={startBulkSync} disabled={syncing}>
                <Play className="mr-2 h-4 w-4" />
                Sync All Heroes
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => (stopRef.current = true)}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {bulkSyncing && (
          <div className="flex-1 min-w-[200px] space-y-1">
            <p className="text-xs text-muted-foreground">
              {bulkProgress.current}/{bulkProgress.total} — {bulkProgress.name}
            </p>
            <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={heroFilter} onValueChange={setHeroFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Heroes</SelectItem>
            {uniqueHeroes.map((name) => {
              const h = diffs.find((d) => d.hero_name === name);
              return h ? (
                <SelectItem key={h.hero_id} value={h.hero_id}>{name}</SelectItem>
              ) : null;
            })}
          </SelectContent>
        </Select>

        {pendingCount > 0 && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkAction("accepted", heroFilter !== "all" ? heroFilter : undefined)}>
              <Check className="mr-1 h-3 w-3" /> Accept All Pending
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("rejected", heroFilter !== "all" ? heroFilter : undefined)}>
              <X className="mr-1 h-3 w-3" /> Reject All Pending
            </Button>
          </div>
        )}

        <Button size="sm" variant="ghost" onClick={clearResolved}>
          <Trash2 className="mr-1 h-3 w-3" /> Clear Resolved
        </Button>
      </div>

      {/* Diffs Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hero</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : diffs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No diffs found. Run a sync to compare data.
                </TableCell>
              </TableRow>
            ) : (
              diffs.map((diff) => (
                <TableRow key={diff.id}>
                  <TableCell className="font-medium">{diff.hero_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{diff.entity_type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{diff.field}</TableCell>
                  <TableCell>
                    <Badge
                      variant={diff.status === "pending" ? "secondary" : diff.status === "accepted" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {diff.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewDiff(diff)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {diff.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary/80"
                            onClick={() => acceptMutation.mutate(diff)}
                            disabled={acceptMutation.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => rejectMutation.mutate(diff.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diff Detail Dialog */}
      <Dialog open={!!viewDiff} onOpenChange={() => setViewDiff(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{viewDiff?.hero_name}</span>
              <Badge variant="outline" className="text-xs">{viewDiff?.entity_type}</Badge>
              <span className="font-mono text-sm text-muted-foreground">{viewDiff?.field}</span>
            </DialogTitle>
          </DialogHeader>
          {viewDiff && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Value</h4>
                <pre className="bg-muted p-3 rounded-md text-xs whitespace-pre-wrap break-words max-h-[50vh] overflow-auto">
                  {viewDiff.current_value
                    ? formatJsonDisplay(viewDiff.current_value)
                    : "(empty)"}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Incoming Value</h4>
                <pre className="bg-muted p-3 rounded-md text-xs whitespace-pre-wrap break-words max-h-[50vh] overflow-auto border-l-2 border-primary">
                  {viewDiff.incoming_value
                    ? formatJsonDisplay(viewDiff.incoming_value)
                    : "(empty)"}
                </pre>
              </div>
              {viewDiff.status === "pending" && (
                <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      rejectMutation.mutate(viewDiff.id);
                      setViewDiff(null);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                  <Button
                    onClick={() => {
                      acceptMutation.mutate(viewDiff);
                      setViewDiff(null);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" /> Accept
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatJsonDisplay(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string") return parsed;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}
