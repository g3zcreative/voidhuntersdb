import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminHeader } from "@/hooks/useAdminHeader";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Clock, Plus, Pencil } from "lucide-react";

interface ActivityItem {
  id: string;
  table: string;
  name: string;
  slug: string;
  action: "created" | "updated";
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
}

const GAME_TABLES = ["hunters", "skills", "effects", "bosses", "boss_skills", "tags"] as const;

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminActivityLog() {
  const { setBreadcrumbs, setActions } = useAdminHeader();

  useEffect(() => {
    setBreadcrumbs([{ label: "Activity Log" }]);
    setActions(null);
    return () => { setBreadcrumbs([]); setActions(null); };
  }, [setBreadcrumbs, setActions]);

  // Fetch profiles for display names
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, email");
      const map = new Map<string, string>();
      (data || []).forEach((p) => map.set(p.id, p.display_name || p.email || p.id.slice(0, 8)));
      return map;
    },
  });

  const { data: activity, isLoading } = useQuery({
    queryKey: ["admin-activity-log"],
    queryFn: async () => {
      const results: ActivityItem[] = [];

      for (const table of GAME_TABLES) {
        const { data } = await supabase
          .from(table as any)
          .select("id, name, slug, created_at, updated_at, created_by, updated_by")
          .order("updated_at", { ascending: false })
          .limit(50);

        if (!data) continue;

        for (const row of data as any[]) {
          const wasUpdated = row.updated_at !== row.created_at;

          // Always add the most recent action
          results.push({
            id: row.id,
            table,
            name: row.name || row.slug || row.id.slice(0, 8),
            slug: row.slug || row.id,
            action: wasUpdated ? "updated" : "created",
            timestamp: wasUpdated ? row.updated_at : row.created_at,
            userId: wasUpdated ? row.updated_by : row.created_by,
            userEmail: null,
          });

          // If updated, also show the creation entry (if created_by exists)
          if (wasUpdated && row.created_by) {
            results.push({
              id: row.id,
              table,
              name: row.name || row.slug || row.id.slice(0, 8),
              slug: row.slug || row.id,
              action: "created",
              timestamp: row.created_at,
              userId: row.created_by,
              userEmail: null,
            });
          }
        }
      }

      // Sort by timestamp descending
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return results.slice(0, 200);
    },
  });

  // Enrich with profile names
  const enriched = (activity || []).map((item) => ({
    ...item,
    userEmail: item.userId && profiles ? profiles.get(item.userId) || item.userId.slice(0, 8) : null,
  }));

  const tableColors: Record<string, string> = {
    hunters: "bg-primary/20 text-primary",
    skills: "bg-blue-500/20 text-blue-400",
    effects: "bg-emerald-500/20 text-emerald-400",
    bosses: "bg-red-500/20 text-red-400",
    boss_skills: "bg-orange-500/20 text-orange-400",
    tags: "bg-yellow-500/20 text-yellow-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display">Activity Log</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Recent additions and edits across all game data tables
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {enriched.map((item, i) => (
            <Link
              key={`${item.id}-${item.action}-${i}`}
              to={`/admin/data/${item.table}/${item.id}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-shrink-0">
                {item.action === "created" ? (
                  <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-emerald-400" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-500/15 flex items-center justify-center">
                    <Pencil className="h-4 w-4 text-blue-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {item.name}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tableColors[item.table] || ""}`}>
                    {item.table}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.action === "created" ? "Created" : "Edited"}
                  {item.userEmail && <> by <span className="text-foreground/70">{item.userEmail}</span></>}
                </p>
              </div>

              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatRelativeTime(item.timestamp)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
