import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save } from "lucide-react";

const ROLES = ["DPS", "Debuff", "Control", "Support", "Sustain"] as const;

// ── Contexts Tab ──
function ContextsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", slug: "", sort_order: 0, image_url: "" });

  const { data: contexts = [] } = useQuery({
    queryKey: ["tier-contexts"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_list_contexts").select("*").order("sort_order");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, slug: form.slug, sort_order: form.sort_order, image_url: form.image_url || null };
      if (editing?.id) {
        await supabase.from("tier_list_contexts").update(payload).eq("id", editing.id).throwOnError();
      } else {
        await supabase.from("tier_list_contexts").insert(payload).throwOnError();
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tier-contexts"] }); setEditing(null); toast({ title: "Saved" }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tier_list_contexts").delete().eq("id", id).throwOnError(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tier-contexts"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Content Tabs</h3>
        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm({ name: "", slug: "", sort_order: contexts.length, image_url: "" }); setEditing({}); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Context
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Context</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
              <div><Label>Image URL (optional)</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              <Button onClick={() => save.mutate()} disabled={!form.name || !form.slug}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Order</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
        <TableBody>
          {contexts.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell className="text-muted-foreground">{c.slug}</TableCell>
              <TableCell>{c.sort_order}</TableCell>
              <TableCell className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setForm(c); setEditing(c); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Criteria Tab ──
function CriteriaTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", weight: 1, max_score: 10, sort_order: 0 });

  const { data: criteria = [] } = useQuery({
    queryKey: ["tier-criteria"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_list_criteria").select("*").order("sort_order");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, description: form.description || null, weight: form.weight, max_score: form.max_score, sort_order: form.sort_order };
      if (editing?.id) {
        await supabase.from("tier_list_criteria").update(payload).eq("id", editing.id).throwOnError();
      } else {
        await supabase.from("tier_list_criteria").insert(payload).throwOnError();
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tier-criteria"] }); setEditing(null); toast({ title: "Saved" }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tier_list_criteria").delete().eq("id", id).throwOnError(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tier-criteria"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scoring Criteria</h3>
        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm({ name: "", description: "", weight: 1, max_score: 10, sort_order: criteria.length }); setEditing({}); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Criterion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Criterion</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Weight</Label><Input type="number" step="0.5" value={form.weight} onChange={(e) => setForm({ ...form, weight: +e.target.value })} /></div>
              <div><Label>Max Score</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: +e.target.value })} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
              <Button onClick={() => save.mutate()} disabled={!form.name}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Weight</TableHead><TableHead>Max</TableHead><TableHead>Description</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
        <TableBody>
          {criteria.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell><Badge variant="secondary">×{c.weight}</Badge></TableCell>
              <TableCell>{c.max_score}</TableCell>
              <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{c.description}</TableCell>
              <TableCell className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setForm(c); setEditing(c); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Score Ranges Tab ──
function ScoreRangesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ tier: "", min_score: 0, sort_order: 0 });

  const { data: ranges = [] } = useQuery({
    queryKey: ["tier-ranges"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_score_ranges").select("*").order("sort_order");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { tier: form.tier, min_score: form.min_score, sort_order: form.sort_order };
      if (editing?.id) {
        await supabase.from("tier_score_ranges").update(payload).eq("id", editing.id).throwOnError();
      } else {
        await supabase.from("tier_score_ranges").insert(payload).throwOnError();
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tier-ranges"] }); setEditing(null); toast({ title: "Saved" }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tier_score_ranges").delete().eq("id", id).throwOnError(); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tier-ranges"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tier Score Ranges</h3>
        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm({ tier: "", min_score: 0, sort_order: ranges.length }); setEditing({}); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Range
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Tier Range</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tier Label</Label><Input value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} placeholder="e.g. T0, T0.5" /></div>
              <div><Label>Min Score</Label><Input type="number" value={form.min_score} onChange={(e) => setForm({ ...form, min_score: +e.target.value })} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
              <Button onClick={() => save.mutate()} disabled={!form.tier}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Tier</TableHead><TableHead>Min Score ≥</TableHead><TableHead>Order</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
        <TableBody>
          {ranges.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-bold">{r.tier}</TableCell>
              <TableCell>{r.min_score}</TableCell>
              <TableCell>{r.sort_order}</TableCell>
              <TableCell className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setForm(r); setEditing(r); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Hunter Scoring Tab ──
function HunterScoringTab() {
  const qc = useQueryClient();
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedHunter, setSelectedHunter] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [role, setRole] = useState<string>("DPS");
  const [tierOverride, setTierOverride] = useState<string>("");
  const [entryTags, setEntryTags] = useState<string>("");
  const [changeNote, setChangeNote] = useState<string>("");

  const { data: contexts = [] } = useQuery({
    queryKey: ["tier-contexts"],
    queryFn: async () => { const { data } = await supabase.from("tier_list_contexts").select("*").order("sort_order"); return data || []; },
  });
  const { data: criteria = [] } = useQuery({
    queryKey: ["tier-criteria"],
    queryFn: async () => { const { data } = await supabase.from("tier_list_criteria").select("*").order("sort_order"); return data || []; },
  });
  const { data: ranges = [] } = useQuery({
    queryKey: ["tier-ranges"],
    queryFn: async () => { const { data } = await supabase.from("tier_score_ranges").select("*").order("sort_order"); return data || []; },
  });
  const { data: hunters = [] } = useQuery({
    queryKey: ["all-hunters"],
    queryFn: async () => { const { data } = await supabase.from("hunters").select("id, name, image_url, rarity").order("name"); return data || []; },
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["tier-entries", selectedContext],
    queryFn: async () => {
      if (!selectedContext) return [];
      const { data } = await supabase.from("hunter_tier_entries").select("*, hunters(name, image_url, rarity)").eq("context_id", selectedContext);
      return data || [];
    },
    enabled: !!selectedContext,
  });

  // Load existing entry when hunter+context selected
  const existingEntry = entries.find((e: any) => e.hunter_id === selectedHunter);

  const loadEntry = (hunterId: string) => {
    setSelectedHunter(hunterId);
    const entry = entries.find((e: any) => e.hunter_id === hunterId);
    if (entry) {
      setScores((entry as any).criteria_scores || {});
      setRole((entry as any).role || "DPS");
      setTierOverride((entry as any).tier_override || "");
      setEntryTags(((entry as any).tags || []).join(", "));
      setChangeNote("");
    } else {
      setScores({});
      setRole("DPS");
      setTierOverride("");
      setEntryTags("");
      setChangeNote("");
    }
  };

  const totalScore = useMemo(() => {
    return criteria.reduce((sum: number, c: any) => sum + (scores[c.id] || 0) * (c.weight || 1), 0);
  }, [scores, criteria]);

  const computedTier = useMemo(() => {
    const sorted = [...ranges].sort((a: any, b: any) => b.min_score - a.min_score);
    for (const r of sorted) {
      if (totalScore >= (r as any).min_score) return (r as any).tier;
    }
    return sorted.length > 0 ? (sorted[sorted.length - 1] as any).tier : "?";
  }, [totalScore, ranges]);

  const maxPossible = useMemo(() => criteria.reduce((s: number, c: any) => s + (c.max_score || 10) * (c.weight || 1), 0), [criteria]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tagsArr = entryTags.split(",").map((t) => t.trim()).filter(Boolean);
      const newTier = tierOverride || computedTier;
      const payload = {
        hunter_id: selectedHunter,
        context_id: selectedContext,
        role,
        criteria_scores: scores,
        total_score: totalScore,
        tier: newTier,
        tier_override: tierOverride || null,
        tags: tagsArr,
      };

      const oldTier = existingEntry ? ((existingEntry as any).tier_override || (existingEntry as any).tier) : null;
      const oldScore = existingEntry ? (existingEntry as any).total_score : null;

      if (existingEntry) {
        await supabase.from("hunter_tier_entries").update(payload).eq("id", (existingEntry as any).id).throwOnError();
      } else {
        await supabase.from("hunter_tier_entries").insert(payload).throwOnError();
      }

      // Log changelog entry if score or tier changed, or if it's a new entry
      if (!existingEntry || oldTier !== newTier || oldScore !== totalScore) {
        await supabase.from("tier_list_changelog").insert({
          hunter_id: selectedHunter,
          context_id: selectedContext,
          old_tier: oldTier,
          new_tier: newTier,
          old_score: oldScore,
          new_score: totalScore,
          note: changeNote || null,
        } as any).throwOnError();
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tier-entries"] }); setChangeNote(""); toast({ title: "Hunter score saved!" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Content Context</Label>
          <Select value={selectedContext} onValueChange={(v) => { setSelectedContext(v); setSelectedHunter(""); }}>
            <SelectTrigger><SelectValue placeholder="Select context..." /></SelectTrigger>
            <SelectContent>{contexts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Hunter</Label>
          <Select value={selectedHunter} onValueChange={loadEntry} disabled={!selectedContext}>
            <SelectTrigger><SelectValue placeholder="Select hunter..." /></SelectTrigger>
            <SelectContent>{hunters.map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name} {h.rarity ? `(${({3:"Rare",4:"Epic",5:"Legendary"} as Record<number,string>)[h.rarity] || h.rarity})` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {selectedHunter && selectedContext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Score: {hunters.find((h: any) => h.id === selectedHunter)?.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg">{totalScore}/{maxPossible}</Badge>
                <Badge className="text-lg">{tierOverride || computedTier}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier Override (leave blank for auto)</Label>
                <Input value={tierOverride} onChange={(e) => setTierOverride(e.target.value)} placeholder="e.g. T0.5" />
              </div>
            </div>

            <div>
              <Label>Tags (comma-separated, shown below portrait)</Label>
              <Input value={entryTags} onChange={(e) => setEntryTags(e.target.value)} placeholder="e.g. Debuff, Delay, AoE" />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Criteria Scores</h4>
              {criteria.map((c: any) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{c.name} <span className="text-muted-foreground">(×{c.weight})</span></span>
                    <span className="font-mono">{scores[c.id] || 0}/{c.max_score}</span>
                  </div>
                  <Slider
                    value={[scores[c.id] || 0]}
                    onValueChange={([v]) => setScores({ ...scores, [c.id]: v })}
                    max={c.max_score}
                    step={1}
                    className="w-full"
                  />
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
              ))}
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> {existingEntry ? "Update" : "Save"} Score
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedContext && entries.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Scored Hunters ({entries.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Hunter</TableHead><TableHead>Role</TableHead><TableHead>Score</TableHead><TableHead>Tier</TableHead><TableHead>Tags</TableHead></TableRow></TableHeader>
              <TableBody>
                {entries.sort((a: any, b: any) => b.total_score - a.total_score).map((e: any) => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => loadEntry(e.hunter_id)}>
                    <TableCell className="font-medium">{e.hunters?.name || e.hunter_id}</TableCell>
                    <TableCell><Badge variant="outline">{e.role}</Badge></TableCell>
                    <TableCell className="font-mono">{e.total_score}</TableCell>
                    <TableCell><Badge>{e.tier_override || e.tier}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(e.tags || []).join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ──
export default function AdminTierList() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Tier List Management</h1>
      <Tabs defaultValue="scoring">
        <TabsList>
          <TabsTrigger value="scoring">Hunter Scoring</TabsTrigger>
          <TabsTrigger value="contexts">Contexts</TabsTrigger>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="ranges">Score Ranges</TabsTrigger>
        </TabsList>
        <TabsContent value="scoring"><HunterScoringTab /></TabsContent>
        <TabsContent value="contexts"><ContextsTab /></TabsContent>
        <TabsContent value="criteria"><CriteriaTab /></TabsContent>
        <TabsContent value="ranges"><ScoreRangesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
