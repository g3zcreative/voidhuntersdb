import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Search, Pencil, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminBuilds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [heroFilter, setHeroFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [synDialogBuildId, setSynDialogBuildId] = useState<string | null>(null);
  const [synHeroId, setSynHeroId] = useState("");
  const [synNote, setSynNote] = useState("");

  // Form state
  const [form, setForm] = useState({
    hero_id: "",
    title: "",
    slug: "",
    weapon_id: "",
    imprint_id: "",
    armor_set_id: "",
    content: "",
    video_url: "",
    published: false,
    featured: false,
    sort_order: 0,
  });

  const { data: heroes = [] } = useQuery({
    queryKey: ["heroes_for_builds"],
    queryFn: async () => {
      const { data } = await supabase.from("heroes").select("id, name, slug, image_url").order("name");
      return data || [];
    },
  });

  const { data: weapons = [] } = useQuery({
    queryKey: ["weapons_for_builds"],
    queryFn: async () => {
      const { data } = await supabase.from("weapons").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: imprints = [] } = useQuery({
    queryKey: ["imprints_for_builds"],
    queryFn: async () => {
      const { data } = await supabase.from("imprints").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: armorSets = [] } = useQuery({
    queryKey: ["armor_sets_for_builds"],
    queryFn: async () => {
      const { data } = await supabase.from("armor_sets").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: builds = [], isLoading } = useQuery({
    queryKey: ["hero_builds_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hero_builds").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: synergies = [] } = useQuery({
    queryKey: ["hero_build_synergies_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hero_build_synergies").select("*").order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const heroMap = useMemo(() => new Map(heroes.map(h => [h.id, h])), [heroes]);
  const weaponMap = useMemo(() => new Map(weapons.map(w => [w.id, w.name])), [weapons]);
  const imprintMap = useMemo(() => new Map(imprints.map(i => [i.id, i.name])), [imprints]);
  const armorSetMap = useMemo(() => new Map(armorSets.map(a => [a.id, a.name])), [armorSets]);

  const filteredBuilds = useMemo(() => {
    let result = builds;
    if (heroFilter !== "all") result = result.filter(b => b.hero_id === heroFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b => {
        const heroName = heroMap.get(b.hero_id)?.name?.toLowerCase() || "";
        return heroName.includes(q) || b.title.toLowerCase().includes(q);
      });
    }
    return result;
  }, [builds, heroFilter, search, heroMap]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        hero_id: form.hero_id,
        title: form.title,
        slug: form.slug,
        weapon_id: form.weapon_id || null,
        imprint_id: form.imprint_id || null,
        armor_set_id: form.armor_set_id || null,
        content: form.content || null,
        video_url: form.video_url || null,
        published: form.published,
        featured: form.featured,
        sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from("hero_builds").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_builds").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero_builds_admin"] });
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: editingId ? "Build updated" : "Build created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_builds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero_builds_admin"] });
      setDeleteId(null);
      toast({ title: "Build deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addSynergyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("hero_build_synergies").insert({
        build_id: synDialogBuildId!,
        hero_id: synHeroId,
        note: synNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero_build_synergies_admin"] });
      setSynHeroId("");
      setSynNote("");
      toast({ title: "Synergy added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSynergyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_build_synergies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero_build_synergies_admin"] });
      toast({ title: "Synergy removed" });
    },
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ hero_id: "", title: "", slug: "", weapon_id: "", imprint_id: "", armor_set_id: "", content: "", video_url: "", published: false, featured: false, sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (build: any) => {
    setEditingId(build.id);
    setForm({
      hero_id: build.hero_id,
      title: build.title,
      slug: build.slug,
      weapon_id: build.weapon_id || "",
      imprint_id: build.imprint_id || "",
      armor_set_id: build.armor_set_id || "",
      content: build.content || "",
      video_url: build.video_url || "",
      published: build.published,
      featured: build.featured,
      sort_order: build.sort_order,
    });
    setDialogOpen(true);
  };

  const buildSynergies = synDialogBuildId ? synergies.filter(s => s.build_id === synDialogBuildId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Hero Builds</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Build</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={heroFilter} onValueChange={setHeroFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by hero" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Heroes</SelectItem>
            {heroes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hero</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Weapon</TableHead>
              <TableHead>Imprint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filteredBuilds.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No builds found</TableCell></TableRow>
            ) : filteredBuilds.map(build => (
              <TableRow key={build.id}>
                <TableCell className="font-medium">{heroMap.get(build.hero_id)?.name || build.hero_id}</TableCell>
                <TableCell>
                  {build.title}
                  {build.featured && <Badge variant="secondary" className="ml-2 text-xs">Featured</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{build.weapon_id ? weaponMap.get(build.weapon_id) || "—" : "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{build.imprint_id ? imprintMap.get(build.imprint_id) || "—" : "—"}</TableCell>
                <TableCell>
                  <Badge variant={build.published ? "default" : "outline"}>{build.published ? "Published" : "Draft"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setSynDialogBuildId(build.id)} title="Synergies">
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(build)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(build.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Build" : "Create Build"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hero *</Label>
                <Select value={form.hero_id} onValueChange={v => setForm(f => ({ ...f, hero_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select hero" /></SelectTrigger>
                  <SelectContent>{heroes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => {
                  const title = e.target.value;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                  setForm(f => ({ ...f, title, slug }));
                }} />
              </div>
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Weapon</Label>
                <Select value={form.weapon_id || "none"} onValueChange={v => setForm(f => ({ ...f, weapon_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {weapons.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Imprint</Label>
                <Select value={form.imprint_id || "none"} onValueChange={v => setForm(f => ({ ...f, imprint_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {imprints.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Armor Set</Label>
                <Select value={form.armor_set_id || "none"} onValueChange={v => setForm(f => ({ ...f, armor_set_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {armorSets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Video URL</Label>
              <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>
            <div>
              <Label>Guide Content (Markdown)</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.published} onCheckedChange={v => setForm(f => ({ ...f, published: v }))} />
                <Label>Published</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} />
                <Label>Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Order</Label>
                <Input type="number" className="w-20" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!form.hero_id || !form.title || !form.slug || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete build?</AlertDialogTitle>
            <AlertDialogDescription>This will also delete all synergies for this build.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Synergies Dialog */}
      <Dialog open={!!synDialogBuildId} onOpenChange={() => setSynDialogBuildId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Build Synergies</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {buildSynergies.length > 0 && (
              <div className="space-y-2">
                {buildSynergies.map(s => (
                  <div key={s.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{heroMap.get(s.hero_id)?.name || s.hero_id}</p>
                      {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteSynergyMutation.mutate(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t pt-4 space-y-3">
              <Label>Add Synergy Hero</Label>
              <Select value={synHeroId} onValueChange={setSynHeroId}>
                <SelectTrigger><SelectValue placeholder="Select hero" /></SelectTrigger>
                <SelectContent>{heroes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Note (optional)" value={synNote} onChange={e => setSynNote(e.target.value)} />
              <Button size="sm" disabled={!synHeroId || addSynergyMutation.isPending} onClick={() => addSynergyMutation.mutate()}>
                <Plus className="mr-2 h-4 w-4" /> Add Synergy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
