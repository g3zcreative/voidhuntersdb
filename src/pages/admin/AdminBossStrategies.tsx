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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Search, Pencil, Users, Loader2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminBossStrategies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bossFilter, setBossFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [teamDialogStratId, setTeamDialogStratId] = useState<string | null>(null);
  const [teamHeroId, setTeamHeroId] = useState("");
  const [teamNote, setTeamNote] = useState("");
  const [videoImportOpen, setVideoImportOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoBossId, setVideoBossId] = useState("");

  const [form, setForm] = useState({
    boss_id: "", title: "", slug: "", content: "", video_url: "",
    published: false, featured: false, sort_order: 0,
  });

  const { data: bosses = [] } = useQuery({
    queryKey: ["bosses_for_strats"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("bosses").select("id, name, slug").order("name");
      return data || [];
    },
  });

  const { data: heroes = [] } = useQuery({
    queryKey: ["heroes_for_strats"],
    queryFn: async () => {
      const { data } = await supabase.from("heroes").select("id, name, slug, image_url").order("name");
      return data || [];
    },
  });

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ["boss_strategies_admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("boss_strategies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["boss_strategy_heroes_admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("boss_strategy_heroes").select("*").order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const bossMap = useMemo(() => new Map(bosses.map((b: any) => [b.id, b] as [string, any])), [bosses]);
  const heroMap = useMemo(() => new Map(heroes.map((h: any) => [h.id, h] as [string, any])), [heroes]);

  const filteredStrategies = useMemo(() => {
    let result = strategies;
    if (bossFilter !== "all") result = result.filter((s: any) => s.boss_id === bossFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s: any) => {
        const bossName = (bossMap.get(s.boss_id) as any)?.name?.toLowerCase() || "";
        return bossName.includes(q) || s.title.toLowerCase().includes(q);
      });
    }
    return result;
  }, [strategies, bossFilter, search, bossMap]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        boss_id: form.boss_id,
        title: form.title,
        slug: form.slug,
        content: form.content || null,
        video_url: form.video_url || null,
        published: form.published,
        featured: form.featured,
        sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("boss_strategies").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("boss_strategies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boss_strategies_admin"] });
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: editingId ? "Strategy updated" : "Strategy created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("boss_strategies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boss_strategies_admin"] });
      setDeleteId(null);
      toast({ title: "Strategy deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addTeamMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("boss_strategy_heroes").insert({
        strategy_id: teamDialogStratId!,
        hero_id: teamHeroId,
        note: teamNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boss_strategy_heroes_admin"] });
      setTeamHeroId("");
      setTeamNote("");
      toast({ title: "Hero added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("boss_strategy_heroes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boss_strategy_heroes_admin"] });
      toast({ title: "Hero removed" });
    },
  });

  const videoImportMutation = useMutation({
    mutationFn: async () => {
      const bossName = (bossMap.get(videoBossId) as any)?.name || "";
      const { data, error } = await supabase.functions.invoke("generate-boss-strategy", {
        body: { video_url: videoUrl, boss_id: videoBossId, boss_name: bossName },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (data) => {
      // Pre-fill the create form with generated content
      const slug = (data.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setEditingId(null);
      setForm({
        boss_id: videoBossId,
        title: data.title || "",
        slug,
        content: data.content || "",
        video_url: data.video_url || videoUrl,
        published: false,
        featured: false,
        sort_order: 0,
      });
      setVideoImportOpen(false);
      setVideoUrl("");
      setVideoBossId("");
      setDialogOpen(true);
      toast({ title: "Strategy generated", description: "Review and save the generated strategy." });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ boss_id: "", title: "", slug: "", content: "", video_url: "", published: false, featured: false, sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (strat: any) => {
    setEditingId(strat.id);
    setForm({
      boss_id: strat.boss_id,
      title: strat.title,
      slug: strat.slug,
      content: strat.content || "",
      video_url: strat.video_url || "",
      published: strat.published,
      featured: strat.featured,
      sort_order: strat.sort_order,
    });
    setDialogOpen(true);
  };

  const stratTeam = teamDialogStratId ? teamMembers.filter((t: any) => t.strategy_id === teamDialogStratId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Boss Strategies</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Strategy</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={openNew}>Create manually</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setVideoImportOpen(true)}>
              <Video className="mr-2 h-4 w-4" />
              Create from Video URL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={bossFilter} onValueChange={setBossFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by boss" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bosses</SelectItem>
            {bosses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boss</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filteredStrategies.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No strategies found</TableCell></TableRow>
            ) : filteredStrategies.map((strat: any) => (
              <TableRow key={strat.id}>
                <TableCell className="font-medium">{(bossMap.get(strat.boss_id) as any)?.name || strat.boss_id}</TableCell>
                <TableCell>
                  {strat.title}
                  {strat.featured && <Badge variant="secondary" className="ml-2 text-xs">Featured</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={strat.published ? "default" : "outline"}>{strat.published ? "Published" : "Draft"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setTeamDialogStratId(strat.id)} title="Team"><Users className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(strat)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(strat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Strategy" : "Create Strategy"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Boss *</Label>
                <Select value={form.boss_id} onValueChange={v => setForm(f => ({ ...f, boss_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select boss" /></SelectTrigger>
                  <SelectContent>{bosses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
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
            <Button disabled={!form.boss_id || !form.title || !form.slug || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete strategy?</AlertDialogTitle>
            <AlertDialogDescription>This will also delete all team members for this strategy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Team Dialog */}
      <Dialog open={!!teamDialogStratId} onOpenChange={() => setTeamDialogStratId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Team Composition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {stratTeam.length > 0 && (
              <div className="space-y-2">
                {stratTeam.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{heroMap.get(t.hero_id)?.name || t.hero_id}</p>
                      {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTeamMutation.mutate(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t pt-4 space-y-3">
              <Label>Add Hero</Label>
              <Select value={teamHeroId || "none"} onValueChange={v => setTeamHeroId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select hero" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {heroes.map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Note (optional)" value={teamNote} onChange={e => setTeamNote(e.target.value)} />
              <Button size="sm" disabled={!teamHeroId || addTeamMutation.isPending} onClick={() => addTeamMutation.mutate()}>
                {addTeamMutation.isPending ? "Adding..." : "Add Hero"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Import Dialog */}
      <Dialog open={videoImportOpen} onOpenChange={setVideoImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Strategy from Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Boss *</Label>
              <Select value={videoBossId || "none"} onValueChange={v => setVideoBossId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select boss" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {bosses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>YouTube Video URL</Label>
              <Input
                placeholder="https://youtu.be/yXoeVhXmJe8"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                disabled={videoImportMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a YouTube video URL. AI will generate a strategy guide from the video content.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoImportOpen(false)} disabled={videoImportMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => videoImportMutation.mutate()}
              disabled={!videoUrl.trim() || !videoBossId || videoImportMutation.isPending}
            >
              {videoImportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Strategy"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
