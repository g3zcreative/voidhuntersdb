import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2, Globe, Lock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyTierLists() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contextId, setContextId] = useState("");

  // Redirect if not logged in
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  const { data: contexts = [] } = useQuery({
    queryKey: ["tier-contexts-public"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_list_contexts").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["my-tier-lists", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tier_lists")
        .select("*, tier_list_contexts(name)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Count entries per list
  const { data: entryCounts = {} } = useQuery({
    queryKey: ["my-tier-list-counts", lists.map((l: any) => l.id).join(",")],
    queryFn: async () => {
      if (lists.length === 0) return {};
      const ids = lists.map((l: any) => l.id);
      const { data } = await supabase
        .from("user_tier_entries")
        .select("tier_list_id")
        .in("tier_list_id", ids);
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[(row as any).tier_list_id] = (counts[(row as any).tier_list_id] || 0) + 1;
      }
      return counts;
    },
    enabled: lists.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await supabase.from("user_tier_lists").update({ name, context_id: contextId }).eq("id", editingId);
      } else {
        await supabase.from("user_tier_lists").insert({ user_id: user!.id, name, context_id: contextId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tier-lists"] });
      setDialogOpen(false);
      setEditingId(null);
      setName("");
      setContextId("");
      toast({ title: editingId ? "Tier list updated" : "Tier list created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("user_tier_lists").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tier-lists"] });
      toast({ title: "Tier list deleted" });
    },
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      await supabase.from("user_tier_lists").update({ is_public: isPublic }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-tier-lists"] }),
  });

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setContextId(contexts[0]?.id || "");
    setDialogOpen(true);
  };

  const openEdit = (list: any) => {
    setEditingId(list.id);
    setName(list.name);
    setContextId(list.context_id);
    setDialogOpen(true);
  };

  return (
    <Layout>
      <SEO title="My Tier Lists | VoidHuntersDB" description="Create and manage your personal Void Hunters tier lists." />
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">My Tier Lists</h1>
          <Button onClick={openCreate} disabled={contexts.length === 0}>
            <Plus className="h-4 w-4 mr-2" /> New Tier List
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">You haven't created any tier lists yet.</p>
            <Button onClick={openCreate} className="mt-4" disabled={contexts.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> Create Your First Tier List
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list: any) => (
              <Card key={list.id} className="group hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{list.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(list)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(list.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{(list as any).tier_list_contexts?.name || "Unknown"}</span>
                    <span>{(entryCounts as any)[list.id] || 0} hunters</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {list.is_public ? <Globe className="h-4 w-4 text-green-400" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      <Label htmlFor={`public-${list.id}`} className="text-xs cursor-pointer">
                        {list.is_public ? "Public" : "Private"}
                      </Label>
                      <Switch
                        id={`public-${list.id}`}
                        checked={list.is_public}
                        onCheckedChange={(v) => togglePublic.mutate({ id: list.id, isPublic: v })}
                      />
                    </div>
                    {list.is_public && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const url = `${window.location.origin}/tier-list/shared/${list.id}`;
                          navigator.clipboard.writeText(url);
                          toast({ title: "Link copied!" });
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Share
                      </Button>
                    )}
                  </div>
                  <Button className="w-full" onClick={() => navigate(`/tier-list/my/${list.id}`)}>
                    Edit Tier List
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Tier List" : "Create Tier List"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My PVE Tier List" />
              </div>
              <div>
                <Label>Context</Label>
                <Select value={contextId} onValueChange={setContextId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select context..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contexts.map((ctx: any) => (
                      <SelectItem key={ctx.id} value={ctx.id}>{ctx.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || !contextId || saveMutation.isPending}>
                {editingId ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
