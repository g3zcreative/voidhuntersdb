import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSchemaRegistry, isAutoField } from "@/hooks/useSchemaRegistry";
import { formatTableLabel } from "@/lib/format-label";
import { useAdminHeader } from "@/hooks/useAdminHeader";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Columns3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

export default function AdminSchemaData() {
  const { tableName } = useParams<{ tableName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getTable, loading: registryLoading } = useSchemaRegistry();
  const { setBreadcrumbs, setActions } = useAdminHeader();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const table = tableName ? getTable(tableName) : undefined;

  const visibleFields = table?.fields.filter((f) => !isAutoField(f)) || [];
  const allTableColumns = table?.fields.filter((f) => {
    if (f.name === "id") return false;
    if (["created_at", "updated_at"].includes(f.name)) return false;
    return true;
  }) || [];

  const storageKey = `admin-hidden-cols-${tableName}`;
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const tableColumns = allTableColumns.filter((c) => !hiddenColumns.has(c.name));

  const toggleColumn = (name: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const { data: rows, isLoading: rowsLoading } = useQuery({
    queryKey: ["schema-data", tableName],
    enabled: !!tableName && !!table,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema-data", tableName] });
      toast({ title: "Item deleted" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  const displayLabel = table ? formatTableLabel(table.label) : "";

  // Set header breadcrumbs and actions
  useEffect(() => {
    if (!table) return;
    setBreadcrumbs([{ label: displayLabel }]);
    setActions(
      <Button size="sm" onClick={() => navigate(`/admin/data/${tableName}/new`)}>
        <Plus className="h-4 w-4 mr-2" />
        New {displayLabel.replace(/s$/, "")}
      </Button>
    );
    return () => { setBreadcrumbs([]); setActions(null); };
  }, [table, displayLabel, tableName]);

  if (registryLoading) {
    return <div className="p-6 space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (!table) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Table "{tableName}" not found in any deployed schema.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/entity-editor")}>
          Go to Entity Editor
        </Button>
      </div>
    );
  }

  const filtered = (rows || []).filter((row: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return tableColumns.some((col) => {
      const val = row[col.name];
      return val != null && String(val).toLowerCase().includes(s);
    });
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="mr-2 h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {allTableColumns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={!hiddenColumns.has(col.name)}
                onCheckedChange={() => toggleColumn(col.name)}
              >
                {col.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {rowsLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {tableColumns.map((col) => (
                  <TableHead key={col.id}>{col.name}</TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColumns.length + 1} className="text-center text-muted-foreground py-12">
                    No items yet. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row: any) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/data/${tableName}/${row.id}`)}
                  >
                    {tableColumns.map((col) => (
                      <TableCell key={col.id} className="max-w-[200px] truncate">
                        {row[col.name] == null ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : typeof row[col.name] === "boolean" ? (
                          row[col.name] ? "Yes" : "No"
                        ) : typeof row[col.name] === "object" ? (
                          <span className="text-xs font-mono text-muted-foreground">JSON</span>
                        ) : (
                          String(row[col.name]).slice(0, 100)
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(row.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
