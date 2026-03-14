import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const columns: ColumnConfig[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "slug", label: "Slug", type: "text", required: true },
  { key: "difficulty", label: "Difficulty", type: "select", options: [
    { value: "Normal", label: "Normal" },
    { value: "Hard", label: "Hard" },
    { value: "Nightmare", label: "Nightmare" },
    { value: "Legendary", label: "Legendary" },
  ]},
  { key: "location", label: "Location", type: "text" },
  { key: "hp", label: "HP", type: "text" },
  { key: "recommended_level", label: "Rec. Level", type: "number" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "lore", label: "Lore", type: "textarea", showInTable: false },
  { key: "image_url", label: "Image", type: "image", storageBucket: "images" },
];

export default function AdminBosses() {
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [triggerCreate, setTriggerCreate] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scrapeMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke("scrape-boss", {
        body: { url },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (data) => {
      try {
        // Insert the boss
        const { data: boss, error: bossError } = await supabase
          .from("bosses")
          .insert({
            name: data.name,
            slug: data.slug,
            description: data.description,
            image_url: data.image_url || null,
            difficulty: data.difficulty || "Normal",
            location: data.location || null,
            lore: data.lore || null,
          })
          .select()
          .single();

        if (bossError) throw bossError;

        // Insert skills if any
        if (data.skills?.length && boss) {
          const skillRows = data.skills.map((s: any, i: number) => ({
            boss_id: boss.id,
            name: s.name,
            slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            skill_type: s.skill_type || "Active",
            description: s.description || null,
            image_url: s.image_url || null,
            damage_type: s.damage_type || null,
            sort_order: i,
          }));

          const { error: skillsError } = await supabase
            .from("boss_skills")
            .insert(skillRows);

          if (skillsError) {
            console.error("Failed to insert skills:", skillsError);
            toast({ title: "Boss created, but skills failed", description: skillsError.message, variant: "destructive" });
          }
        }

        queryClient.invalidateQueries({ queryKey: ["admin", "bosses"] });
        toast({ title: "Boss imported", description: `${data.name} imported with ${data.skills?.length || 0} skills.` });
        setImportOpen(false);
        setImportUrl("");
      } catch (err: any) {
        toast({ title: "Import failed", description: err.message, variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Scrape failed", description: err.message, variant: "destructive" });
    },
  });

  const handleImport = () => {
    if (!importUrl.trim()) return;
    scrapeMutation.mutate(importUrl.trim());
  };


  return (
    <>
      <AdminCrudPage
        tableName="bosses"
        title="Bosses"
        columns={columns}
        customNewButton={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">+ New</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setTriggerCreate(prev => prev + 1)}>
                Create manually
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setImportOpen(true)}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Import from URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        triggerCreate={triggerCreate}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Boss from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="import-url">Raven Pyros Boss URL</Label>
              <Input
                id="import-url"
                placeholder="https://www.ravenpyros.com/bosses/golden-guardian"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                disabled={scrapeMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a boss page URL from ravenpyros.com to auto-import boss data and skills.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={scrapeMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importUrl.trim() || scrapeMutation.isPending}>
              {scrapeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
