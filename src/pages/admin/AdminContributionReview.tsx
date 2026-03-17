import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminHeader } from "@/hooks/useAdminHeader";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSchemaRegistry, isAutoField, fieldTypeToInputType } from "@/hooks/useSchemaRegistry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, ArrowLeft } from "lucide-react";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export default function AdminContributionReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setBreadcrumbs, setActions } = useAdminHeader();
  const { user } = useAuth();
  const { getTable } = useSchemaRegistry();
  const [reviewNote, setReviewNote] = useState("");

  const { data: contribution, isLoading } = useQuery({
    queryKey: ["contribution", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Load current record for updates (diff view)
  const { data: currentRecord } = useQuery({
    queryKey: ["contribution-current", contribution?.table_name, contribution?.record_id],
    enabled: !!contribution && contribution.action === "update" && !!contribution.record_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(contribution!.table_name as any)
        .select("*")
        .eq("id", contribution!.record_id!)
        .single();
      if (error) return null;
      return data as Record<string, any>;
    },
  });

  // Contributor profile
  const { data: contributorProfile } = useQuery({
    queryKey: ["contributor-profile", contribution?.contributor_id],
    enabled: !!contribution,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", contribution!.contributor_id)
        .single();
      return data;
    },
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: "Contributions", href: "/admin/contributions" },
      { label: contribution ? ((contribution.payload as any)?.name || "Review") : "Review" },
    ]);
    return () => { setBreadcrumbs([]); setActions(null); };
  }, [contribution]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!contribution || !user) throw new Error("Missing data");
      const payload = { ...(contribution.payload as Record<string, any>) };
      const tableName = contribution.table_name;

      // Remove internal keys
      const inlineSkills = payload._inline_skills;
      const multiRefs = payload._multi_refs;
      delete payload._inline_skills;
      delete payload._multi_refs;

      // Set audit columns
      payload.updated_by = user.id;

      let itemId = contribution.record_id;

      if (contribution.action === "create") {
        payload.created_by = user.id;
        const { data, error } = await supabase
          .from(tableName as any)
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        itemId = (data as any).id;
      } else {
        const { error } = await supabase
          .from(tableName as any)
          .update(payload)
          .eq("id", contribution.record_id!);
        if (error) throw error;
      }

      // Process inline skills (hunters)
      if (inlineSkills && Array.isArray(inlineSkills) && itemId) {
        for (const skill of inlineSkills) {
          if (skill._status === "deleted" && skill.id) {
            await supabase.from("skills").delete().eq("id", skill.id);
          } else if (skill._status === "new" && skill.name?.trim()) {
            await supabase.from("skills").insert({
              hunter_id: itemId,
              name: skill.name,
              slug: skill.slug || slugify(skill.name),
              type: skill.type,
              sort_order: skill.sort_order,
              max_level: skill.max_level,
              cooldown: skill.cooldown,
              description: skill.description,
              icon: skill.icon,
              effects: skill.effects,
              created_by: user.id,
              updated_by: user.id,
            });
          } else if (skill._status === "existing" && skill.id) {
            await supabase.from("skills").update({
              name: skill.name,
              slug: skill.slug,
              type: skill.type,
              sort_order: skill.sort_order,
              max_level: skill.max_level,
              cooldown: skill.cooldown,
              description: skill.description,
              icon: skill.icon,
              effects: skill.effects,
              updated_by: user.id,
            }).eq("id", skill.id);
          }
        }
      }

      // Process multi-refs (junction tables)
      if (multiRefs && typeof multiRefs === "object" && itemId) {
        for (const [junctionTable, refData] of Object.entries(multiRefs as Record<string, any>)) {
          const { fkToSelf, fkToRelated, selectedIds } = refData;
          // Delete existing junctions
          await supabase.from(junctionTable as any).delete().eq(fkToSelf, itemId);
          // Insert new ones
          if (selectedIds?.length > 0) {
            const rows = selectedIds.map((relId: string) => ({
              [fkToSelf]: itemId,
              [fkToRelated]: relId,
            }));
            await supabase.from(junctionTable as any).insert(rows);
          }
        }
      }

      // Mark as approved
      const { error: updateError } = await (supabase
        .from("contributions") as any)
        .update({
          status: "approved",
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_note: reviewNote || null,
        })
        .eq("id", contribution.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      queryClient.invalidateQueries({ queryKey: ["contribution", id] });
      toast({ title: "Contribution approved", description: "Changes have been applied." });
      navigate("/admin/contributions");
    },
    onError: (err: any) => {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!contribution || !user) throw new Error("Missing data");
      const { error } = await supabase
        .from("contributions")
        .update({
          status: "rejected",
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_note: reviewNote || null,
        })
        .eq("id", contribution.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      toast({ title: "Contribution rejected" });
      navigate("/admin/contributions");
    },
    onError: (err: any) => {
      toast({ title: "Rejection failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!contribution) {
    return <div className="text-center py-12 text-muted-foreground">Contribution not found.</div>;
  }

  const payload = contribution.payload as Record<string, any>;
  const isPending = contribution.status === "pending";
  const table = getTable(contribution.table_name);

  // Get editable field names from schema for display
  const fieldNames = table
    ? table.fields.filter((f) => !isAutoField(f)).map((f) => f.name)
    : Object.keys(payload).filter((k) => !k.startsWith("_"));

  const contributorName = contributorProfile?.display_name || contributorProfile?.email || contribution.contributor_id.slice(0, 8);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/contributions")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contributions
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold">
            {payload?.name || payload?.title || "Unnamed"}{" "}
            <Badge variant="outline" className="ml-2 font-mono text-xs align-middle">
              {contribution.table_name}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contribution.action === "create" ? "New record" : "Update to existing record"} by{" "}
            <span className="text-foreground">{contributorName}</span>{" "}
            · {new Date(contribution.created_at).toLocaleString()}
          </p>
        </div>
        <Badge
          className={
            contribution.status === "pending"
              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              : contribution.status === "approved"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          }
        >
          {contribution.status}
        </Badge>
      </div>

      <Separator />

      {/* Payload fields */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Proposed Data
        </h2>
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {fieldNames.map((key) => {
            if (key.startsWith("_")) return null;
            const proposed = payload[key];
            const current = currentRecord ? (currentRecord as any)[key] : undefined;
            const isChanged = contribution.action === "update" && current !== undefined && JSON.stringify(current) !== JSON.stringify(proposed);

            return (
              <div key={key} className="space-y-1">
                <Label className="capitalize text-xs text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </Label>
                <div className="flex gap-4">
                  {isChanged && (
                    <div className="flex-1 p-2 rounded bg-red-500/10 border border-red-500/20 text-sm">
                      <span className="text-xs text-red-400 block mb-1">Current</span>
                      <span className="text-muted-foreground break-all">
                        {typeof current === "object" ? JSON.stringify(current, null, 2) : String(current ?? "—")}
                      </span>
                    </div>
                  )}
                  <div className={`flex-1 p-2 rounded text-sm ${isChanged ? "bg-green-500/10 border border-green-500/20" : "bg-muted/30"}`}>
                    {isChanged && <span className="text-xs text-green-400 block mb-1">Proposed</span>}
                    <span className="break-all">
                      {proposed === null || proposed === undefined
                        ? <span className="text-muted-foreground">—</span>
                        : typeof proposed === "object"
                        ? <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(proposed, null, 2)}</pre>
                        : String(proposed)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline skills if present */}
      {payload._inline_skills && Array.isArray(payload._inline_skills) && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Skills ({payload._inline_skills.filter((s: any) => s._status !== "deleted").length})
          </h2>
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            {payload._inline_skills
              .filter((s: any) => s._status !== "deleted")
              .map((skill: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <Badge variant="outline" className="text-xs capitalize">
                    {skill._status}
                  </Badge>
                  <span className="font-medium">{skill.name}</span>
                  <span className="text-muted-foreground text-sm">{skill.type || "—"}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Multi-refs if present */}
      {payload._multi_refs && Object.keys(payload._multi_refs).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Relationships
          </h2>
          <div className="bg-card border border-border rounded-lg p-6 space-y-2">
            {Object.entries(payload._multi_refs as Record<string, any>).map(([junction, data]) => (
              <div key={junction} className="text-sm">
                <span className="font-mono text-muted-foreground">{junction}:</span>{" "}
                {data.selectedIds?.length || 0} items
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviewer note already present */}
      {contribution.reviewer_note && !isPending && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Review Note
          </h2>
          <div className="bg-card border border-border rounded-lg p-4 text-sm">
            {contribution.reviewer_note}
          </div>
        </div>
      )}

      {/* Review actions */}
      {isPending && (
        <div className="space-y-4">
          <Separator />
          <div className="space-y-2">
            <Label>Review Note (optional)</Label>
            <Textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add feedback for the contributor..."
              className="min-h-[80px]"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              {approveMutation.isPending ? "Applying..." : "Approve & Apply"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
