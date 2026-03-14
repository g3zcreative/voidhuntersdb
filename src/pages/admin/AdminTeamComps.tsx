import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Users, Trash2, Eye, Search } from "lucide-react";
import { format } from "date-fns";

export default function AdminTeamComps() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewTeamId, setViewTeamId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch all teams with user email
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["admin_teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, title, notes, user_id, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for display names
  const userIds = useMemo(() => [...new Set(teams.map((t) => t.user_id))], [teams]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin_team_profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      return data || [];
    },
  });
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  // Fetch slots + reference data for detail view
  const { data: teamSlots = [] } = useQuery({
    queryKey: ["admin_team_slots", viewTeamId],
    enabled: !!viewTeamId,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_slots")
        .select("*, heroes:hero_id(name, image_url), weapons:weapon_id(name), imprints:imprint_id(name), armor1:armor_set_1_id(name), armor2:armor_set_2_id(name), armor3:armor_set_3_id(name)")
        .eq("team_id", viewTeamId!)
        .order("slot_number");
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (teamId: string) => {
      await supabase.from("team_slots").delete().eq("team_id", teamId);
      await supabase.from("teams").delete().eq("id", teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_teams"] });
      setDeleteId(null);
      toast({ title: "Team deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!search) return teams;
    const q = search.toLowerCase();
    return teams.filter((t) => {
      const profile = profileMap.get(t.user_id);
      return (
        t.title.toLowerCase().includes(q) ||
        profile?.display_name?.toLowerCase().includes(q) ||
        profile?.email?.toLowerCase().includes(q)
      );
    });
  }, [teams, search, profileMap]);

  const viewTeam = teams.find((t) => t.id === viewTeamId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Team Compositions
        </h1>
        <span className="text-sm text-muted-foreground">{teams.length} teams total</span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No teams found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => {
                  const profile = profileMap.get(t.user_id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {profile?.display_name || profile?.email || t.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(t.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewTeamId(t.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View detail dialog */}
      <Dialog open={!!viewTeamId} onOpenChange={(o) => !o && setViewTeamId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewTeam?.title || "Team Details"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {teamSlots.map((slot: any) => (
              <div key={slot.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/20">
                {slot.heroes?.image_url && (
                  <img src={slot.heroes.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Slot {slot.slot_number}{slot.slot_number === 1 ? " (Leader)" : ""}: {slot.heroes?.name || "Empty"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[
                      slot.weapons?.name && `Weapon: ${slot.weapons.name}`,
                      slot.imprints?.name && `Imprint: ${slot.imprints.name}`,
                      slot.armor1?.name && `Armor: ${slot.armor1.name}`,
                      slot.armor2?.name && slot.armor2.name,
                      slot.armor3?.name && slot.armor3.name,
                    ].filter(Boolean).join(" · ") || "No equipment"}
                  </p>
                </div>
              </div>
            ))}
            {viewTeam?.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{viewTeam.notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTeamId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
