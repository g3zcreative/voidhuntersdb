import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Download, FolderOpen, FileCode, Trash2, Rocket } from "lucide-react";

interface EntityEditorToolbarProps {
  schemaName: string;
  onSchemaNameChange: (name: string) => void;
  onAddEntity: () => void;
  onSave: () => void;
  onExportSQL: () => void;
  onClear: () => void;
  saving: boolean;
  schemas: { id: string; name: string }[];
  selectedSchemaId: string | null;
  onLoadSchema: (id: string) => void;
}

export function EntityEditorToolbar({
  schemaName,
  onSchemaNameChange,
  onAddEntity,
  onSave,
  onExportSQL,
  onClear,
  saving,
  schemas,
  selectedSchemaId,
  onLoadSchema,
}: EntityEditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50">
      <Input
        value={schemaName}
        onChange={(e) => onSchemaNameChange(e.target.value)}
        className="h-8 w-48 text-sm"
        placeholder="Schema name..."
      />

      {schemas.length > 0 && (
        <Select
          value={selectedSchemaId ?? ""}
          onValueChange={onLoadSchema}
        >
          <SelectTrigger className="h-8 w-48 text-sm">
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Load schema..." />
          </SelectTrigger>
          <SelectContent>
            {schemas.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-sm">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="h-4 w-px bg-border" />

      <Button variant="outline" size="sm" onClick={onAddEntity} className="h-8">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Entity
      </Button>

      <Button variant="outline" size="sm" onClick={onExportSQL} className="h-8">
        <FileCode className="h-3.5 w-3.5 mr-1.5" />
        Export SQL
      </Button>

      <Button variant="outline" size="sm" onClick={onClear} className="h-8 text-destructive hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        Clear
      </Button>

      <div className="ml-auto" />

      <Button size="sm" onClick={onSave} disabled={saving} className="h-8">
        <Save className="h-3.5 w-3.5 mr-1.5" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
