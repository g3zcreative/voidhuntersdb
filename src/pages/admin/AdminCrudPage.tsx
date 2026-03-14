import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const MDEditor = lazy(() => import("@uiw/react-md-editor"));
import { supabase } from "@/integrations/supabase/client";
import { compressImage, compressedExtension } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CalendarIcon, Upload, X, Loader2, Image as ImageIcon, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Columns3 } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function ImageUploadButton({ bucket, onUploaded }: { bucket: string; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${compressedExtension}`;
      const { error } = await supabase.storage.from(bucket).upload(path, compressed);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(urlData.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <Button type="button" variant="outline" size="icon" onClick={() => inputRef.current?.click()} disabled={uploading} title="Upload image">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
    </>
  );
}

export interface ColumnConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "boolean" | "json" | "markdown" | "datetime" | "image" | "select" | "slider";
  options?: { value: string; label: string }[];
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  required?: boolean;
  showInTable?: boolean;
  editable?: boolean;
  storageBucket?: string;
  onChange?: (value: string, setFormData: React.Dispatch<React.SetStateAction<RowData>>) => void;
  renderBelow?: (formData: RowData) => React.ReactNode;
}

interface AdminCrudPageProps {
  tableName: string;
  title: string;
  columns: ColumnConfig[];
  defaults?: RowData;
  onNewOverride?: () => void;
  triggerCreate?: number;
  onAfterCreate?: (row: RowData) => void;
  customNewButton?: React.ReactNode;
}

type RowData = Record<string, unknown>;

const ADMIN_PAGE_SIZE = 25;

export function AdminCrudPage({ tableName, title, columns, defaults, onNewOverride, triggerCreate, onAfterCreate, customNewButton }: AdminCrudPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<RowData | null>(null);
  const [formData, setFormData] = useState<RowData>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const hasSlugColumn = columns.some(c => c.key === "slug");
  const slugSourceKey = columns.some(c => c.key === "name") ? "name" : columns.some(c => c.key === "title") ? "title" : null;

  const toSlug = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const editableColumns = columns.filter(c => c.editable !== false);
  const allTableColumns = columns.filter(c => c.showInTable !== false);
  const storageKey = `admin-hidden-cols-${tableName}`;
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const tableColumns = allTableColumns.filter(c => !hiddenColumns.has(c.key));
  const searchableKeys = tableColumns.filter(c => c.type !== "boolean" && c.type !== "json").map(c => c.key);

  const toggleColumn = (key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await (supabase.from(tableName as any) as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as RowData[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: RowData) => {
      if (editingRow) {
        const { error } = await (supabase.from(tableName as any) as any).update(row).eq("id", editingRow.id);
        if (error) throw error;
        return null;
      } else {
        const { data, error } = await (supabase.from(tableName as any) as any).insert(row).select().single();
        if (error) throw error;
        return data as RowData;
      }
    },
    onSuccess: (created: RowData | null) => {
      const wasCreating = !editingRow;
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: [tableName] });
      setDialogOpen(false);
      setEditingRow(null);
      setFormData({});
      toast({ title: wasCreating ? "Created" : "Updated" });
      if (wasCreating && created && onAfterCreate) {
        onAfterCreate(created);
      }
    },
    onError: (err: Error) => {
      setIsSaving(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(tableName as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      setDeleteId(null);
      toast({ title: "Deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingRow(null);
    const fieldDefaults: RowData = {};
    editableColumns.forEach(c => {
      if (c.type === "boolean") fieldDefaults[c.key] = false;
      else if (c.type === "number") fieldDefaults[c.key] = 0;
      else if (c.type === "json") fieldDefaults[c.key] = "{}";
      else if (c.type === "datetime") fieldDefaults[c.key] = new Date().toISOString();
      else fieldDefaults[c.key] = "";
    });
    setFormData({ ...fieldDefaults, ...defaults });
    setDialogOpen(true);
  };

  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      openCreate();
    }
  }, [triggerCreate]);

  const openEdit = (row: RowData) => {
    setEditingRow(row);
    const data: RowData = {};
    editableColumns.forEach(c => {
      const val = row[c.key];
      if (c.type === "json") data[c.key] = JSON.stringify(val ?? {}, null, 2);
      else data[c.key] = val ?? "";
    });
    setFormData(data);
    setDialogOpen(true);
  };

  const isExternalUrl = (url: string) => {
    if (!url || typeof url !== "string") return false;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    return (url.startsWith("http://") || url.startsWith("https://")) && !url.startsWith(supabaseUrl);
  };

  const proxyImageUrl = async (url: string, bucket: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("proxy-image", {
      body: { url, bucket },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: RowData = {};
      editableColumns.forEach(c => {
        let val = formData[c.key];
        if (c.type === "number") val = Number(val);
        else if (c.type === "json") {
          try { val = JSON.parse(val as string); } catch { val = {}; }
        }
        if (!c.required && (val === "" || val === undefined)) {
          val = null;
        }
        payload[c.key] = val;
      });

      // Proxy external image URLs to our storage
      const imageColumns = editableColumns.filter(
        c => (c.key.includes("image_url") || c.key.includes("icon_url")) && c.storageBucket
      );
      for (const col of imageColumns) {
        const val = payload[col.key];
        if (typeof val === "string" && isExternalUrl(val)) {
          try {
            payload[col.key] = await proxyImageUrl(val, col.storageBucket!);
          } catch (e: any) {
            toast({ title: `Failed to proxy image for ${col.label}`, description: e.message, variant: "destructive" });
          }
        }
      }

      saveMutation.mutate(payload);
    } catch {
      setIsSaving(false);
    }
  };

  const renderField = (col: ColumnConfig) => {
    const value = formData[col.key];
    if (col.type === "boolean") {
      return (
        <div key={col.key} className="flex items-center gap-2">
          <Switch checked={!!value} onCheckedChange={v => setFormData(p => ({ ...p, [col.key]: v }))} />
          <Label>{col.label}</Label>
        </div>
      );
    }
    if (col.type === "datetime") {
      const dateValue = value ? new Date(value as string) : undefined;
      return (
        <div key={col.key} className="space-y-1">
          <Label>{col.label}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateValue && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP p") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={d => setFormData(p => ({ ...p, [col.key]: d ? d.toISOString() : "" }))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }
    if (col.type === "markdown") {
      return (
        <div key={col.key} className="space-y-1" data-color-mode="dark">
          <Label>{col.label}</Label>
          <Suspense fallback={<Textarea rows={6} value={String(value ?? "")} onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))} />}>
            <MDEditor
              value={String(value ?? "")}
              onChange={v => setFormData(p => ({ ...p, [col.key]: v ?? "" }))}
              height={300}
            />
          </Suspense>
        </div>
      );
    }
    if (col.type === "image") {
      const imageUrl = value ? String(value) : "";
      const fileInputId = `file-upload-${col.key}`;
      return (
        <div key={col.key} className="space-y-2">
          <Label>{col.label}</Label>
          {imageUrl && (
            <div className="relative inline-block">
              <img src={imageUrl} alt="Preview" className="h-32 rounded-md border border-border object-cover" />
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, [col.key]: "" }))}
                className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Paste image URL or upload a file"
              value={imageUrl}
              onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
              className="flex-1"
            />
            <ImageUploadButton
              bucket={col.storageBucket || "news-images"}
              onUploaded={(url) => setFormData(p => ({ ...p, [col.key]: url }))}
            />
          </div>
        </div>
      );
    }
    if (col.type === "select" && col.options) {
      return (
        <div key={col.key} className="space-y-1">
          <Label>{col.label}</Label>
          <Select value={String(value ?? "")} onValueChange={(v: string) => { setFormData(p => ({ ...p, [col.key]: v })); col.onChange?.(v, setFormData); }}>
            <SelectTrigger><SelectValue placeholder={`Select ${col.label.toLowerCase()}`} /></SelectTrigger>
            <SelectContent>
              {col.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (col.type === "slider") {
      const numVal = Number(value ?? col.sliderMin ?? 0);
      return (
        <div key={col.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{col.label}</Label>
            <span className="text-sm text-muted-foreground tabular-nums">{numVal.toFixed(1)}</span>
          </div>
          <Slider
            value={[numVal]}
            min={col.sliderMin ?? 0}
            max={col.sliderMax ?? 1}
            step={col.sliderStep ?? 0.1}
            onValueChange={([v]) => setFormData(p => ({ ...p, [col.key]: v }))}
          />
        </div>
      );
    }
    if (col.type === "textarea" || col.type === "json") {
      return (
        <div key={col.key} className="space-y-1">
          <Label>{col.label}</Label>
          <Textarea rows={col.type === "json" ? 6 : 4} value={String(value ?? "")} onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))} />
        </div>
      );
    }
    const autoSlug = hasSlugColumn && slugSourceKey && col.key === slugSourceKey;
    return (
      <div key={col.key} className="space-y-1">
        <Label>{col.label}</Label>
        <Input
          type={col.type === "number" ? "number" : "text"}
          value={String(value ?? "")}
          onChange={e => {
            const newVal = e.target.value;
            setFormData(p => {
              const updated = { ...p, [col.key]: newVal };
              if (autoSlug) updated.slug = toSlug(newVal);
              return updated;
            });
          }}
          required={col.required}
        />
      </div>
    );
  };

  const displayValue = (row: RowData, col: ColumnConfig) => {
    const val = row[col.key];
    if (val === null || val === undefined) return "—";
    if (col.type === "boolean") return val ? "Yes" : "No";
    if (col.type === "json") return "{ ... }";
    if (col.type === "select" && col.options) {
      const opt = col.options.find(o => o.value === val);
      if (opt) return opt.label;
    }
    if (col.type === "datetime") {
      try { return format(new Date(val as string), "PPP"); } catch { return String(val); }
    }
    const s = String(val);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(row => searchableKeys.some(key => String(row[key] ?? "").toLowerCase().includes(q)));
  }, [rows, search, searchableKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold">{title}</h1>
        {customNewButton || <Button onClick={onNewOverride || openCreate}><Plus className="mr-2 h-4 w-4" /> New</Button>}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="mr-2 h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {allTableColumns.map(c => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={!hiddenColumns.has(c.key)}
                onCheckedChange={() => toggleColumn(c.key)}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : paged.length === 0 ? (
        <p className="text-muted-foreground">{search ? "No matching records." : "No records yet."}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-0 w-full table-fixed">
            <TableHeader>
              <TableRow>
                {tableColumns.map(c => (
                  <TableHead key={c.key} className="cursor-pointer select-none" onClick={() => toggleSort(c.key)}>
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {sortKey === c.key ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row) => (
                <TableRow key={row.id as string}>
                  {tableColumns.map(c => <TableCell key={c.key}>{displayValue(row, c)}</TableCell>)}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id as string)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit" : "Create"} {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editableColumns.map(col => (
              <div key={`wrap-${col.key}`}>
                {renderField(col)}
                {col.renderBelow?.(formData)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || saveMutation.isPending}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading images...</> : saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
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
