import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { X, ChevronDown, Plus, Loader2 } from "lucide-react";
import type { ManyToManyRelation } from "@/hooks/useSchemaRegistry";

interface MultiRefFieldProps {
  /** The ID of the item being edited (null if new/unsaved) */
  itemId: string | null;
  /** The many-to-many relationship definition */
  relation: ManyToManyRelation;
  /** Currently selected IDs (managed by parent) */
  selectedIds: string[];
  /** Callback when selection changes */
  onChange: (ids: string[]) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function MultiRefField({ itemId, relation, selectedIds, onChange }: MultiRefFieldProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // Load all available options from the related table
  const { data: allOptions = [], isLoading } = useQuery({
    queryKey: ["multi-ref-options", relation.relatedTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(relation.relatedTable as any)
        .select("*")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as Array<Record<string, any>>;
    },
  });

  // Load current junction rows for this item
  const { data: currentJunctions = [] } = useQuery({
    queryKey: ["multi-ref-junctions", relation.junctionTable, itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(relation.junctionTable as any)
        .select("*")
        .eq(relation.junctionFkToSelf, itemId!);
      if (error) throw error;
      return (data || []) as Array<Record<string, any>>;
    },
  });

  // Initialize selectedIds from junction rows on first load
  const junctionIds = useMemo(
    () => (Array.isArray(currentJunctions) ? currentJunctions : []).map((j) => j[relation.junctionFkToRelated] as string),
    [currentJunctions, relation.junctionFkToRelated]
  );

  const displayName = (opt: Record<string, any>) =>
    opt.name || opt.title || opt.label || opt.slug || "Unnamed";

  const selectedOptions = useMemo(
    () => allOptions.filter((opt) => selectedIds.includes(opt.id)),
    [allOptions, selectedIds]
  );

  const filteredOptions = useMemo(() => {
    if (!search) return allOptions;
    const s = search.toLowerCase();
    return allOptions.filter((opt) => displayName(opt).toLowerCase().includes(s));
  }, [allOptions, search]);

  const toggleOption = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((s) => s !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    },
    [selectedIds, onChange]
  );

  const removeOption = useCallback(
    (id: string) => {
      onChange(selectedIds.filter((s) => s !== id));
    },
    [selectedIds, onChange]
  );

  const handleCreateNew = useCallback(async () => {
    if (!search.trim()) return;
    setCreating(true);
    try {
      const slug = slugify(search.trim());
      const { data, error } = await supabase
        .from(relation.relatedTable as any)
        .insert({ name: search.trim(), slug } as any)
        .select("id")
        .single();
      if (error) throw error;
      if (data) {
        onChange([...selectedIds, (data as any).id]);
        queryClient.invalidateQueries({ queryKey: ["multi-ref-options", relation.relatedTable] });
        setSearch("");
        toast({ title: `Created "${search.trim()}"` });
      }
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [search, relation.relatedTable, selectedIds, onChange, queryClient, toast]);

  const relatedLabel = relation.relatedTable.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const exactMatch = search.trim() && allOptions.some((opt) => displayName(opt).toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="space-y-2">
      {/* Selected tags as badges */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <Badge
              key={opt.id}
              variant="secondary"
              className="gap-1 pl-2 pr-1 py-1 text-xs"
            >
              {displayName(opt)}
              <button
                type="button"
                onClick={() => removeOption(opt.id)}
                className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between text-muted-foreground font-normal"
          >
            <span>
              {selectedIds.length === 0
                ? `Select ${relatedLabel}...`
                : `${selectedIds.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b border-border">
            <Input
              placeholder={`Search or create ${relatedLabel.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim() && !exactMatch) {
                  e.preventDefault();
                  handleCreateNew();
                }
              }}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : filteredOptions.length === 0 && !search.trim() ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No {relatedLabel.toLowerCase()} available
              </p>
            ) : (
              <>
                {filteredOptions.map((opt) => {
                  const isSelected = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(opt.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {isSelected && (
                          <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {displayName(opt)}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Create new inline */}
          {search.trim() && !exactMatch && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={creating}
                className="w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-muted text-primary transition-colors"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create "{search.trim()}"
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
