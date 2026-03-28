import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, GripVertical, Key, Globe, Settings2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export interface EntityField {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string;
  uiWidget?: "text" | "textarea" | "select";
  uiOptions?: string[];
}

export interface EntityNodeData {
  label: string;
  fields: EntityField[];
  color: string;
  publicPage?: boolean;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onAddField: (nodeId: string) => void;
  onRemoveField: (nodeId: string, fieldId: string) => void;
  onUpdateField: (nodeId: string, fieldId: string, updates: Partial<EntityField>) => void;
  onDeleteNode?: (nodeId: string, label: string) => void;
  onTogglePublicPage?: (nodeId: string) => void;
  [key: string]: unknown;
}

const FIELD_TYPES = [
  "uuid", "text", "integer", "bigint", "numeric", "boolean",
  "jsonb", "timestamptz", "date", "timestamp",
];

function FieldSettingsPopover({
  field,
  onUpdate,
}: {
  field: EntityField;
  onUpdate: (updates: Partial<EntityField>) => void;
}) {
  const [open, setOpen] = useState(false);
  const widget = field.uiWidget || "";
  const [localOptions, setLocalOptions] = useState((field.uiOptions || []).join(", "));

  // Sync local state when field changes externally
  const optionsStr = (field.uiOptions || []).join(", ");
  React.useEffect(() => {
    if (!open) setLocalOptions(optionsStr);
  }, [optionsStr, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-5 w-5 opacity-0 group-hover:opacity-100 ${widget ? "text-primary opacity-100" : "text-muted-foreground"}`}
          title="Field settings"
        >
          <Settings2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" side="right" align="start">
        <div className="space-y-1.5">
          <Label className="text-xs">Widget</Label>
          <Select
            value={widget || "auto"}
            onValueChange={(v) => {
              const newWidget = v === "auto" ? undefined : (v as EntityField["uiWidget"]);
              onUpdate({ uiWidget: newWidget, uiOptions: newWidget === "select" ? field.uiOptions || [] : undefined });
            }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto" className="text-xs">Auto (from type)</SelectItem>
              <SelectItem value="select" className="text-xs">Select (dropdown)</SelectItem>
              <SelectItem value="textarea" className="text-xs">Textarea</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(widget === "select" || (!widget && false)) && (
          <div className="space-y-1.5">
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input
              value={localOptions}
              onChange={(e) => setLocalOptions(e.target.value)}
              onBlur={() => {
                const opts = localOptions.split(",").map((s) => s.trim()).filter(Boolean);
                onUpdate({ uiOptions: opts });
              }}
              placeholder="Option1, Option2, ..."
              className="h-7 text-xs"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function EntityNodeComponent({ id, data, selected }: NodeProps) {
  const {
    label, fields, color, publicPage,
    onUpdateLabel, onAddField, onRemoveField, onUpdateField, onDeleteNode, onTogglePublicPage,
  } = data as unknown as EntityNodeData;

  return (
    <div
      className={`min-w-[280px] rounded-lg border shadow-lg transition-shadow ${
        selected ? "ring-2 ring-primary shadow-primary/20" : ""
      }`}
      style={{ borderColor: `hsl(${color})` }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-lg flex items-center gap-2"
        style={{ backgroundColor: `hsl(${color} / 0.15)` }}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab" />
        <Input
          value={label as string}
          onChange={(e) => onUpdateLabel(id, e.target.value)}
          className="h-7 text-sm font-semibold bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
          placeholder="table_name"
        />
        {onTogglePublicPage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 shrink-0 ${publicPage ? "text-primary" : "text-muted-foreground/40"}`}
                onClick={() => onTogglePublicPage(id)}
                title="Toggle public page"
              >
                <Globe className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {publicPage ? "Has public page — click to hide" : "No public page — click to enable"}
            </TooltipContent>
          </Tooltip>
        )}
        {onDeleteNode && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteNode(id, label as string)}
            title="Delete table"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
          style={{ left: -6 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
          style={{ right: -6 }}
        />
      </div>

      {/* Fields */}
      <div className="bg-card p-1.5 space-y-0.5 max-h-[300px] overflow-y-auto">
        {(fields as EntityField[]).map((field) => (
          <div
            key={field.id}
            className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-muted/50 group text-xs"
          >
            {field.isPrimaryKey && (
              <Key className="h-3 w-3 shrink-0 text-accent" />
            )}
            <Input
              value={field.name}
              onChange={(e) => onUpdateField(id, field.id, { name: e.target.value })}
              className="h-6 text-xs bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 min-w-[80px]"
              placeholder="column_name"
            />
            <Select
              value={field.type}
              onValueChange={(val) => onUpdateField(id, field.id, { type: val })}
            >
              <SelectTrigger className="h-6 text-xs w-[100px] border-none bg-muted/30 px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-0.5">
              <Checkbox
                checked={field.nullable}
                onCheckedChange={(checked) =>
                  onUpdateField(id, field.id, { nullable: !!checked })
                }
                className="h-3.5 w-3.5"
                title="Nullable"
              />
              <span className="text-muted-foreground text-[10px]">N</span>
            </div>
            <FieldSettingsPopover
              field={field}
              onUpdate={(updates) => onUpdateField(id, field.id, updates)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
              onClick={() => onRemoveField(id, field.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add field */}
      <div className="border-t border-border p-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-6 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onAddField(id)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Column
        </Button>
      </div>
    </div>
  );
}

export default memo(EntityNodeComponent);
