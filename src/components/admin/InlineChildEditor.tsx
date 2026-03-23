import React, { useRef, useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, Upload, Loader2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, compressedExtension } from "@/lib/image-utils";
import { toast } from "@/hooks/use-toast";
import {
  useSchemaRegistry,
  isAutoField,
  fieldTypeToInputType,
  type SchemaField,
  type InlineChildRelation,
} from "@/hooks/useSchemaRegistry";
import { formatTableLabel } from "@/lib/format-label";

// ── Inline image upload ──
function InlineImageUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
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

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="https://..."
        className="flex-1"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 h-9 w-9"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload image"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={() => onChange(null)}
          title="Clear"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ── JSON key/value editor ──
function JsonFieldEditorInline({
  value,
  onChange,
}: {
  value: Record<string, any> | null;
  onChange: (val: Record<string, any> | null) => void;
}) {
  const obj = value && typeof value === "object" ? value : {};
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
    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const remove = (key: string) => {
    const next = { ...obj };
    delete next[key];
    onChange(Object.keys(next).length > 0 ? next : null);
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
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(key)} className="shrink-0 h-8 w-8">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...obj, "": "" })}
        className="text-xs"
      >
        + Add entry
      </Button>
    </div>
  );
}

// ── Generic field renderer ──
function InlineFieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: any;
  onChange: (val: any) => void;
}) {
  const lowerName = field.name.toLowerCase();
  const isImageField = ["image", "icon", "avatar", "logo", "thumbnail", "banner", "cover", "photo"].some(
    (kw) => lowerName.includes(kw)
  );
  if (isImageField) {
    return <InlineImageUpload value={value} onChange={onChange} />;
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
      return <JsonFieldEditorInline value={value} onChange={onChange} />;
    case "textarea":
      return (
        <Textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="min-h-[60px]"
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

// ── Types ──
export interface InlineChildRow {
  _key: string;
  _status: "new" | "existing" | "deleted";
  [field: string]: any;
}

let keyCounter = 0;
function nextKey() {
  return `child-${++keyCounter}-${Date.now()}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ── Main component ──
interface InlineChildEditorProps {
  relation: InlineChildRelation;
  parentId: string | null;
  rows: InlineChildRow[];
  onChange: (rows: InlineChildRow[]) => void;
  /** Nested inline children for this child table's rows */
  depth?: number;
}

export function createEmptyRow(fields: SchemaField[]): InlineChildRow {
  const row: InlineChildRow = {
    _key: nextKey(),
    _status: "new",
  };
  fields.forEach((f) => {
    if (isAutoField(f)) return;
    if (f.type === "boolean" || f.type === "bool") row[f.name] = false;
    else row[f.name] = null;
  });
  return row;
}

export function existingToRow(record: Record<string, any>): InlineChildRow {
  return {
    ...record,
    _key: record.id || nextKey(),
    _status: "existing",
  };
}

export function InlineChildEditor({
  relation,
  parentId,
  rows,
  onChange,
  depth = 0,
}: InlineChildEditorProps) {
  const { getTable, getInlineChildren } = useSchemaRegistry();
  const table = getTable(relation.childTable);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const lastAddedKeyRef = useRef<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Get editable fields (excluding auto fields and the FK column pointing to parent)
  const editableFields = useMemo(() => {
    if (!table) return [];
    return table.fields.filter((f) => {
      if (isAutoField(f)) return false;
      if (f.name === relation.fkColumn) return false;
      if (f.name === "created_by" || f.name === "updated_by") return false;
      // Hide complex JSON fields from inline forms — edit them on the full detail page instead
      if (f.type.toLowerCase() === "jsonb" || f.type.toLowerCase() === "json") return false;
      return true;
    });
  }, [table, relation.fkColumn]);

  // Nested inline children for this child table
  const nestedInlineChildren = useMemo(
    () => (depth < 2 ? getInlineChildren(relation.childTable) : []),
    [relation.childTable, getInlineChildren, depth]
  );

  useEffect(() => {
    if (lastAddedKeyRef.current) {
      const el = itemRefs.current[lastAddedKeyRef.current];
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      }
      lastAddedKeyRef.current = null;
    }
  }, [rows]);

  const visibleRows = rows.filter((r) => r._status !== "deleted");
  const displayLabel = formatTableLabel(relation.childTable);
  const singularLabel = displayLabel.replace(/s$/, "");

  const updateRow = (key: string, field: string, value: any) => {
    onChange(
      rows.map((r) => {
        if (r._key !== key) return r;
        const updated = { ...r, [field]: value };
        if (field === "name" && r._status === "new" && editableFields.some((f) => f.name === "slug")) {
          updated.slug = slugify(String(value || ""));
        }
        return updated;
      })
    );
  };

  const deleteRow = (key: string) => {
    onChange(
      rows.map((r) => {
        if (r._key !== key) return r;
        return { ...r, _status: "deleted" as const };
      })
    );
  };

  const addRow = () => {
    const newRow = createEmptyRow(editableFields);
    lastAddedKeyRef.current = newRow._key;
    setOpenItems((prev) => [...prev, newRow._key]);
    onChange([...rows, newRow]);
  };

  // Get row display label
  const getRowLabel = (row: InlineChildRow, index: number) => {
    return row.name || row.title || row.label || `New ${singularLabel}`;
  };

  // Get row subtitle hint
  const getRowSubtitle = (row: InlineChildRow) => {
    if (row.type) return `· ${row.type}`;
    if (row.level != null) return `· Lv.${row.level}`;
    return "";
  };

  if (!table) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {displayLabel}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add {singularLabel}
        </Button>
      </div>

      {visibleRows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          No {displayLabel.toLowerCase()} yet. Click "Add {singularLabel}" to get started.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full">
            {visibleRows.map((row, index) => (
              <AccordionItem
                key={row._key}
                value={row._key}
                className="border-border"
                ref={(el) => { itemRefs.current[row._key] = el; }}
              >
                <div className="flex items-center">
                  <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <span className="text-xs text-muted-foreground font-mono w-6">
                        {row.sort_order ?? index + 1}
                      </span>
                      <span className="font-medium text-sm">
                        {getRowLabel(row, index)}
                      </span>
                      {getRowSubtitle(row) && (
                        <span className="text-xs text-muted-foreground">{getRowSubtitle(row)}</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mr-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRow(row._key);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    {editableFields.map((field) => {
                      const isWide = ["description", "content", "effects"].includes(field.name) ||
                        fieldTypeToInputType(field.type) === "json" ||
                        fieldTypeToInputType(field.type) === "textarea";
                      return (
                        <div key={field.id} className={`space-y-1.5 ${isWide ? "col-span-2" : ""}`}>
                          <Label className="text-xs capitalize">{field.name.replace(/_/g, " ")}</Label>
                          <InlineFieldInput
                            field={field}
                            value={row[field.name]}
                            onChange={(val) => updateRow(row._key, field.name, val)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Nested inline children */}
                  {nestedInlineChildren.length > 0 && (
                    <div className="mt-4 pl-2 border-l-2 border-border space-y-4">
                      {nestedInlineChildren.map((nestedRel) => (
                        <InlineChildEditor
                          key={nestedRel.childTable}
                          relation={nestedRel}
                          parentId={row.id || null}
                          rows={(row[`_children_${nestedRel.childTable}`] || []) as InlineChildRow[]}
                          onChange={(nestedRows) =>
                            updateRow(row._key, `_children_${nestedRel.childTable}`, nestedRows)
                          }
                          depth={depth + 1}
                        />
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
