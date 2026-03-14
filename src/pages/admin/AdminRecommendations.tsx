import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Search, Swords, Stamp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  weapon: <Swords className="h-4 w-4" />,
  imprint: <Stamp className="h-4 w-4" />,
  synergy: <Users className="h-4 w-4" />,
};

export default function AdminRecommendations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [heroFilter, setHeroFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Form state
  const [formHeroId, setFormHeroId] = useState("");
  const [formType, setFormType] = useState<string>("weapon");
  const [formTargetId, setFormTargetId] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formNote, setFormNote] = useState("");

  // Data queries
  const { data: heroes = [] } = useQuery({
    queryKey: ["heroes_for_recs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("heroes").select("id, name, slug, image_url").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: weapons = [] } = useQuery({
    queryKey: ["weapons_for_recs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("weapons").select("id, name, slug, image_url").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: imprints = [] } = useQuery({
    queryKey: ["imprints_for_recs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("imprints").select("id, name, slug, image_url").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["hero_recommendations_admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("hero_recommendations").select("*").order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  // Resolve names
  const heroMap = useMemo(() => new Map(heroes.map(h => [h.id, h])), [heroes]);
  const weaponMap = useMemo(() => new Map(weapons.map(w => [w.id, w])), [weapons]);
  const imprintMap = useMemo(() => new Map(imprints.map(i => [i.id, i])), [imprints]);

  const resolveTarget = (type: string, targetId: string) => {
    if (type === "weapon") return weaponMap.get(targetId)?.name || targetId;
    if (type === "imprint") return imprintMap.get(targetId)?.name || targetId;
    if (type === "synergy") return heroMap.get(targetId)?.name || targetId;
    return targetId;
  };

  const targetOptions = useMemo(() => {
    if (formType === "weapon") return weapons.map(w => ({ value: w.id, label: w.name }));
    if (formType === "imprint") return imprints.map(i => ({ value: i.id, label: i.name }));
    if (formType === "synergy") return heroes.map(h => ({ value: h.id, label: h.name }));
    return [];
  }, [formType, weapons, imprints, heroes]);

  // Filtered recs
  const filteredRecs = useMemo(() => {
    let result = recs;
    if (heroFilter !== "all") result = result.filter(r => r.hero_id === heroFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => {
        const heroName = heroMap.get(r.hero_id)?.name?.toLowerCase() || "";
        const targetName = resolveTarget(r.recommendation_type, r.target_id).toLowerCase();
        return heroName.includes(q) || targetName.includes(q) || r.recommendation_type.includes(q);
      });
    }
    return result;
  }, [recs, heroFilter, search, heroMap, weaponMap, imprintMap]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("hero_recommendations").insert({
        hero_id: formHeroId,
        recommendation_type: formType,
        target_id: formTargetId,
        sort_order: formSortOrder,
        note: formNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero_recommendations_admin"] });
      setDialogOpen(false);
      toast({ title: "Recommendation added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("hero_recommendations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero_recommendations_admin"] });
      setDeleteId(null);
      toast({ title: "Recommendation deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openNew = () => {
    setFormHeroId("");
    setFormType("weapon");
    setFormTargetId("");
    setFormSortOrder(0);
    setFormNote("");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Hero Recommendations</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Recommendation</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={heroFilter} onValueChange={setHeroFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by hero" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Heroes</SelectItem>
            {heroes.map(h => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hero</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filteredRecs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No recommendations found</TableCell></TableRow>
            ) : (
              filteredRecs.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{heroMap.get(rec.hero_id)?.name || rec.hero_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 capitalize">
                      {TYPE_ICONS[rec.recommendation_type]} {rec.recommendation_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{resolveTarget(rec.recommendation_type, rec.target_id)}</TableCell>
                  <TableCell>{rec.sort_order}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{rec.note || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(rec.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Recommendation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hero</Label>
              <Select value={formHeroId} onValueChange={setFormHeroId}>
                <SelectTrigger><SelectValue placeholder="Select hero" /></SelectTrigger>
                <SelectContent>
                  {heroes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => { setFormType(v); setFormTargetId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weapon">Weapon</SelectItem>
                  <SelectItem value="imprint">Imprint</SelectItem>
                  <SelectItem value="synergy">Hero Synergy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target</Label>
              <Select value={formTargetId} onValueChange={setFormTargetId}>
                <SelectTrigger><SelectValue placeholder={`Select ${formType}`} /></SelectTrigger>
                <SelectContent>
                  {targetOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={formSortOrder} onChange={e => setFormSortOrder(Number(e.target.value))} />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="e.g. Best in slot for PvP" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!formHeroId || !formTargetId || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recommendation?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
