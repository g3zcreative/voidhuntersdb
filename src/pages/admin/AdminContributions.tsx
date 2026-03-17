import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminHeader } from "@/hooks/useAdminHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AdminContributions() {
  const navigate = useNavigate();
  const { setBreadcrumbs, setActions } = useAdminHeader();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Contributions" }]);
    return () => { setBreadcrumbs([]); setActions(null); };
  }, []);

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ["contributions", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("contributions")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contributor profiles for display names
  const contributorIds = [...new Set(contributions.map((c: any) => c.contributor_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["contributor-profiles", contributorIds.join(",")],
    enabled: contributorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", contributorIds);
      return data || [];
    },
  });

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  const filtered = contributions.filter((c: any) => {
    if (!search) return true;
    const name = (c.payload as any)?.name || (c.payload as any)?.title || "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      c.table_name.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No {statusFilter !== "all" ? statusFilter : ""} contributions found.
        </div>
      ) : (
        <div className="border border-border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Contributor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => {
                const payload = c.payload as Record<string, any>;
                const itemName = payload?.name || payload?.title || "Unnamed";
                const profile = profileMap.get(c.contributor_id);
                const contributorName = profile?.display_name || profile?.email || c.contributor_id.slice(0, 8);

                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/contributions/${c.id}`)}
                  >
                    <TableCell className="font-medium">{itemName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {c.table_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{c.action}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{contributorName}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[c.status] || ""}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Review</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
