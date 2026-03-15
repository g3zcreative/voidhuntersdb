import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSchemaRegistry,
  isAutoField,
  fieldTypeToInputType,
  type SchemaField,
  type ManyToManyRelation,
} from "@/hooks/useSchemaRegistry";
import { useAdminHeader } from "@/hooks/useAdminHeader";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, Upload, Loader2, X } from "lucide-react";
import { compressImage, compressedExtension } from "@/lib/image-utils";
import { MultiRefField } from "@/components/admin/MultiRefField";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Detect if a field is a foreign key by name pattern (e.g. role_id → roles table) */
function getFkTable(fieldName: string): string | null {
  if (!fieldName.endsWith("_id")) return null;
  const base = fieldName.slice(0, -3);
  return base + "s";
}

function FkSelect({
  field,
  value,
  onChange,
  referencedTable,
}: {
  field: SchemaField;
  value: any;
  onChange: (val: any) => void;
  referencedTable: string;
}) {
  const { data: options = [], isLoading } = useQuery({
    queryKey: ["fk-options", referencedTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(referencedTable as any)
        .select("*")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as Array<Record<string, any>>;
    },
  });

  const displayName = (opt: Record<string, any>) =>
    opt.name || opt.title || opt.label || opt.slug || "Unnamed";

  return (
    <Select value={value || ""} onValueChange={(v) => onChange(v || null)}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading..." : `Select ${field.name.replace(/_id$/, "").replace(/_/g, " ")}...`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-muted-foreground">None</span>
        </SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {displayName(opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Structured key/value editor for JSON fields like stats */
function JsonFieldEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (val: any) => void;
}) {
  // Normalize value to object
  const obj: Record<string, any> = React.useMemo(() => {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value === "string") {
      try { return JSON.parse(value); } catch { /* ignore */ }
      // Try key:value format
      const parsed: Record<string, any> = {};
      value.split(/[,\n]+/).forEach((pair: string) => {
        const [k, v] = pair.split(":").map((s: string) => s.trim());
        if (k) parsed[k] = isNaN(Number(v)) ? v : Number(v);
      });
      if (Object.keys(parsed).length > 0) return parsed;
    }
    return {};
  }, [value]);

  const entries = Object.entries(obj);

  const update = (oldKey: string, newKey: string, newVal: string) => {
    const next: Record<string, any> = {};
    entries.forEach(([k, v]) => {
      if (k === oldKey) {
        if (newKey.trim()) next[newKey.trim()] = isNaN(Number(newVal)) ? newVal : Number(newVal);
      } else {
        next[k] = v;
      }
    });
    onChange(next);
  };

  const remove = (key: string) => {
    const next = { ...obj };
    delete next[key];
    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const addEntry = () => {
    onChange({ ...obj, "": 0 });
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Key"
            value={key}
            onChange={(e) => update(key, e.target.value, String(val))}
            className="flex-1 font-mono text-xs"
          />
          <Input
            placeholder="Value"
            value={String(val ?? "")}
            onChange={(e) => update(key, key, e.target.value)}
            className="flex-1 font-mono text-xs"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(key)} className="shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addEntry} className="text-xs">
        + Add field
      </Button>
    </div>
  );
}

function isStorageUrl(url: string): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  return !!url && url.startsWith(supabaseUrl);
}

async function downloadAndUploadUrl(url: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("migrate-images", {
    body: { single_url: url },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.newUrl) throw new Error("No URL returned from server");
  return data.newUrl;
}

function ImageUploadField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (val: string | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${compressedExtension}`;
      const { error } = await supabase.storage.from("images").upload(path, compressed);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
      onChange(urlData.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handlePasteUrl = async (url: string) => {
    if (!url || isStorageUrl(url) || !url.startsWith("http")) {
      onChange(url || null);
      return;
    }
    setUploading(true);
    try {
      const storedUrl = await downloadAndUploadUrl(url);
      onChange(storedUrl);
      toast({ title: "Image saved", description: "External image downloaded and stored." });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
      onChange(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={(e) => {
            const url = e.target.value;
            if (url && url.startsWith("http") && !isStorageUrl(url)) {
              handlePasteUrl(url);
            }
          }}
          placeholder="Image URL or upload..."
          className="flex-1"
        />
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button type="button" variant="outline" size="icon" onClick={() => inputRef.current?.click()} disabled={uploading} title="Upload image">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} title="Clear image">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {uploading && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> Downloading and saving image...
        </p>
      )}
      {value && !uploading && (
        <div className="space-y-1">
          <img src={value} alt="Preview" className="h-24 w-24 rounded-md object-cover border border-border" />
          {isStorageUrl(value) && (
            <p className="text-xs text-muted-foreground">✓ Stored in your database</p>
          )}
        </div>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: any;
  onChange: (val: any) => void;
}) {
  // Image URL fields get upload support
  if (field.name === "image_url" || field.name.endsWith("_image_url") || field.name === "icon") {
    return <ImageUploadField value={value} onChange={onChange} />;
  }

  // Check if this is a FK field
  const fkTable = getFkTable(field.name);
  if (fkTable && field.type.toLowerCase() === "uuid") {
    return (
      <FkSelect
        field={field}
        value={value}
        onChange={(v) => onChange(v === "__none__" ? null : v)}
        referencedTable={fkTable}
      />
    );
  }

  const inputType = fieldTypeToInputType(field.type);

  switch (inputType) {
    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm text-muted-foreground">{value ? "Yes" : "No"}</span>
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={value ? String(value).slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "json":
      return <JsonFieldEditor value={value} onChange={onChange} />;
    case "textarea":
      return (
        <Textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="min-h-[100px]"
        />
      );
    default:
      return (
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }
}

export default function AdminSchemaItemEditor() {
  const { tableName, id } = useParams<{ tableName: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getTable, getManyToMany, loading: registryLoading } = useSchemaRegistry();
  const { setBreadcrumbs, setActions } = useAdminHeader();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [initialized, setInitialized] = useState(false);

  // Multi-ref state: { [relatedTable]: string[] }
  const [multiRefSelections, setMultiRefSelections] = useState<Record<string, string[]>>({});
  const [multiRefInitialized, setMultiRefInitialized] = useState(false);

  const isNew = id === "new";
  const table = tableName ? getTable(tableName) : undefined;
  const manyToManyRelations = useMemo(
    () => (tableName ? getManyToMany(tableName) : []),
    [tableName, getManyToMany]
  );

  // Fields that are managed by multi-ref should be hidden from the regular form
  // e.g., the "tags" uuid field on hunters that's a leftover single-ref
  const multiRefRelatedTables = useMemo(
    () => new Set(manyToManyRelations.map((r) => r.relatedTable)),
    [manyToManyRelations]
  );

  const editableFields = useMemo(
    () => (table?.fields || []).filter((f) => {
      if (isAutoField(f)) return false;
      // Hide fields that share a name with a multi-ref related table (e.g. "tags" field on hunters)
      if (multiRefRelatedTables.has(f.name)) return false;
      return true;
    }),
    [table, multiRefRelatedTables]
  );

  const nameField = editableFields.find((f) => f.name === "name");
  const slugField = editableFields.find((f) => f.name === "slug");
  const basicFields = editableFields.filter((f) => ["name", "slug"].includes(f.name));
  const customFields = editableFields.filter((f) => !["name", "slug"].includes(f.name));

  // Load existing item
  const { data: existingItem, isLoading: itemLoading } = useQuery({
    queryKey: ["schema-item", tableName, id],
    enabled: !isNew && !!tableName && !!table,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Load existing junction rows for multi-ref fields
  const junctionQueries = manyToManyRelations.map((rel) =>
    useQuery({
      queryKey: ["multi-ref-junctions", rel.junctionTable, id],
      enabled: !isNew && !!id,
      queryFn: async () => {
        const { data, error } = await supabase
          .from(rel.junctionTable as any)
          .select("*")
          .eq(rel.junctionFkToSelf, id!);
        if (error) throw error;
        return { relation: rel, rows: (data || []) as Array<Record<string, any>> };
      },
    })
  );

  // Initialize multi-ref selections from junction rows
  useEffect(() => {
    if (multiRefInitialized) return;
    if (isNew) {
      const defaults: Record<string, string[]> = {};
      manyToManyRelations.forEach((rel) => { defaults[rel.relatedTable] = []; });
      setMultiRefSelections(defaults);
      setMultiRefInitialized(true);
      return;
    }
    // Wait for all junction queries to load
    const allLoaded = junctionQueries.every((q) => !q.isLoading);
    if (!allLoaded) return;
    const selections: Record<string, string[]> = {};
    junctionQueries.forEach((q) => {
      if (q.data) {
        selections[q.data.relation.relatedTable] = q.data.rows.map(
          (r) => r[q.data.relation.junctionFkToRelated] as string
        );
      }
    });
    setMultiRefSelections(selections);
    setMultiRefInitialized(true);
  }, [isNew, multiRefInitialized, manyToManyRelations, junctionQueries]);

  useEffect(() => {
    if (existingItem && !initialized) {
      setFormData(existingItem as Record<string, any>);
      setInitialized(true);
    } else if (isNew && !initialized) {
      const defaults: Record<string, any> = {};
      editableFields.forEach((f) => {
        if (f.type === "boolean" || f.type === "bool") defaults[f.name] = false;
        else defaults[f.name] = null;
      });
      setFormData(defaults);
      setInitialized(true);
    }
  }, [existingItem, isNew, initialized, editableFields]);

  const updateField = (fieldName: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldName]: value };
      if (fieldName === "name" && slugField && isNew) {
        next.slug = slugify(String(value || ""));
      }
      return next;
    });
  };

  const updateMultiRef = useCallback((relatedTable: string, ids: string[]) => {
    setMultiRefSelections((prev) => ({ ...prev, [relatedTable]: ids }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {};
      editableFields.forEach((f) => {
        if (formData[f.name] !== undefined) {
          payload[f.name] = formData[f.name];
        }
      });

      let itemId = id;

      if (isNew) {
        const { data, error } = await supabase
          .from(tableName as any)
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        itemId = (data as any).id;
      } else {
        const { error } = await supabase.from(tableName as any).update(payload).eq("id", id);
        if (error) throw error;
      }

      // Save multi-ref junction rows
      for (const rel of manyToManyRelations) {
        const selectedIds = multiRefSelections[rel.relatedTable] || [];

        // Get current junction rows
        const { data: currentRows } = await supabase
          .from(rel.junctionTable as any)
          .select("*")
          .eq(rel.junctionFkToSelf, itemId!);

        const currentRelatedIds = new Set(
          ((currentRows || []) as Array<Record<string, any>>).map((r) => r[rel.junctionFkToRelated] as string)
        );
        const desiredIds = new Set(selectedIds);

        // Delete removed
        const toDelete = [...currentRelatedIds].filter((id) => !desiredIds.has(id));
        if (toDelete.length > 0) {
          const { error } = await supabase
            .from(rel.junctionTable as any)
            .delete()
            .eq(rel.junctionFkToSelf, itemId!)
            .in(rel.junctionFkToRelated, toDelete);
          if (error) throw error;
        }

        // Insert added
        const toInsert = [...desiredIds].filter((id) => !currentRelatedIds.has(id));
        if (toInsert.length > 0) {
          const rows = toInsert.map((relId) => ({
            [rel.junctionFkToSelf]: itemId,
            [rel.junctionFkToRelated]: relId,
          }));
          const { error } = await supabase
            .from(rel.junctionTable as any)
            .insert(rows as any);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema-data", tableName] });
      manyToManyRelations.forEach((rel) => {
        queryClient.invalidateQueries({ queryKey: ["multi-ref-junctions", rel.junctionTable] });
      });
      toast({ title: isNew ? "Item created" : "Item saved" });
      navigate(`/admin/data/${tableName}`);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const displayLabel = table ? table.label.charAt(0).toUpperCase() + table.label.slice(1) : "";
  const singularLabel = displayLabel.replace(/s$/, "");

  useEffect(() => {
    if (!table) return;
    setBreadcrumbs([
      { label: displayLabel, href: `/admin/data/${tableName}` },
      { label: isNew ? `New ${singularLabel}` : (formData.name || formData.title || `Edit ${singularLabel}`) },
    ]);
    setActions(
      <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : isNew ? "Create" : "Save"}
      </Button>
    );
    return () => { setBreadcrumbs([]); setActions(null); };
  }, [table, displayLabel, singularLabel, tableName, isNew, formData.name, formData.title, saveMutation.isPending]);

  if (registryLoading || (!isNew && itemLoading)) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!table) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Table "{tableName}" not found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* Basic Info */}
      {basicFields.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Basic Info</h2>
          <div className="space-y-4 bg-card border border-border rounded-lg p-6">
            {basicFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label className="capitalize">{field.name.replace(/_/g, " ")}</Label>
                <FieldInput
                  field={field}
                  value={formData[field.name]}
                  onChange={(val) => updateField(field.name, val)}
                />
                {field.nullable && (
                  <p className="text-xs text-muted-foreground">Optional</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {basicFields.length > 0 ? "Custom Fields" : "Fields"}
          </h2>
          <div className="space-y-4 bg-card border border-border rounded-lg p-6">
            {customFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label className="capitalize">{field.name.replace(/_/g, " ")}</Label>
                <FieldInput
                  field={field}
                  value={formData[field.name]}
                  onChange={(val) => updateField(field.name, val)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{field.type}</span>
                  {field.nullable && (
                    <span className="text-xs text-muted-foreground">· Optional</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Reference Fields (many-to-many via junction tables) */}
      {manyToManyRelations.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Relationships
          </h2>
          <div className="space-y-4 bg-card border border-border rounded-lg p-6">
            {manyToManyRelations.map((rel) => {
              const label = rel.relatedTable.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div key={rel.junctionTable} className="space-y-2">
                  <Label>{label}</Label>
                  <MultiRefField
                    itemId={isNew ? null : id!}
                    relation={rel}
                    selectedIds={multiRefSelections[rel.relatedTable] || []}
                    onChange={(ids) => updateMultiRef(rel.relatedTable, ids)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select multiple or create new {label.toLowerCase()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Read-only metadata for existing items */}
      {!isNew && existingItem && (
        <div className="mt-8 space-y-4">
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>ID: <span className="font-mono">{(existingItem as any).id}</span></p>
            {(existingItem as any).created_at && (
              <p>Created: {new Date((existingItem as any).created_at).toLocaleString()}</p>
            )}
            {(existingItem as any).updated_at && (
              <p>Updated: {new Date((existingItem as any).updated_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
