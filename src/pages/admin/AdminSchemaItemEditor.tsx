import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSchemaRegistry,
  isAutoField,
  fieldTypeToInputType,
  type SchemaField,
} from "@/hooks/useSchemaRegistry";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
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
      return (
        <Textarea
          className="font-mono text-xs min-h-[120px]"
          value={typeof value === "object" ? JSON.stringify(value, null, 2) : value ?? ""}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
        />
      );
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
  const { getTable, loading: registryLoading } = useSchemaRegistry();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [initialized, setInitialized] = useState(false);

  const isNew = id === "new";
  const table = tableName ? getTable(tableName) : undefined;

  const editableFields = useMemo(
    () => (table?.fields || []).filter((f) => !isAutoField(f)),
    [table]
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

  useEffect(() => {
    if (existingItem && !initialized) {
      setFormData(existingItem as Record<string, any>);
      setInitialized(true);
    } else if (isNew && !initialized) {
      // Pre-fill defaults
      const defaults: Record<string, any> = {};
      editableFields.forEach((f) => {
        if (f.type === "boolean" || f.type === "bool") defaults[f.name] = false;
        else defaults[f.name] = null;
      });
      setFormData(defaults);
      setInitialized(true);
    }
  }, [existingItem, isNew, initialized, editableFields]);

  // Auto-slug from name
  const updateField = (fieldName: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldName]: value };
      if (fieldName === "name" && slugField && isNew) {
        next.slug = slugify(String(value || ""));
      }
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Build payload from editable fields only
      const payload: Record<string, any> = {};
      editableFields.forEach((f) => {
        if (formData[f.name] !== undefined) {
          payload[f.name] = formData[f.name];
        }
      });

      if (isNew) {
        const { error } = await supabase.from(tableName as any).insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName as any).update(payload).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schema-data", tableName] });
      toast({ title: isNew ? "Item created" : "Item saved" });
      navigate(`/admin/data/${tableName}`);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

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

  const displayLabel = table.label.charAt(0).toUpperCase() + table.label.slice(1);
  const singularLabel = displayLabel.replace(/s$/, "");

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/data/${tableName}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">{displayLabel}</p>
            <h1 className="text-xl font-display font-bold">
              {isNew ? `New ${singularLabel}` : (formData.name || formData.title || `Edit ${singularLabel}`)}
            </h1>
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : isNew ? "Create" : "Save"}
        </Button>
      </div>

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
