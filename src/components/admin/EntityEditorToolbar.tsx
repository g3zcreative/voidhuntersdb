import { Button } from "@/components/ui/button";
import { Plus, Save, Download, FileCode, Rocket, RefreshCw } from "lucide-react";

interface EntityEditorToolbarProps {
  onAddEntity: () => void;
  onSave: () => void;
  onExportSQL: () => void;
  onDeploy?: () => void;
  onSyncFromDB?: () => void;
  saving: boolean;
  syncing?: boolean;
  deployed?: boolean;
}

export function EntityEditorToolbar({
  onAddEntity,
  onSave,
  onExportSQL,
  onDeploy,
  onSyncFromDB,
  saving,
  syncing,
  deployed,
}: EntityEditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 flex-wrap">
      <span className="text-sm font-medium text-foreground mr-2">Schema Editor</span>
      {deployed && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">Deployed</span>
      )}

      <div className="h-4 w-px bg-border" />

      <Button variant="outline" size="sm" onClick={onAddEntity} className="h-8">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Entity
      </Button>

      {onSyncFromDB && (
        <Button variant="outline" size="sm" onClick={onSyncFromDB} disabled={syncing} className="h-8">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync from DB"}
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onExportSQL} className="h-8">
        <FileCode className="h-3.5 w-3.5 mr-1.5" />
        Export SQL
      </Button>

      <div className="ml-auto" />

      {onDeploy && (
        <Button
          variant="default"
          size="sm"
          onClick={onDeploy}
          className="h-8"
        >
          <Rocket className="h-3.5 w-3.5 mr-1.5" />
          Deploy to DB
        </Button>
      )}

      <Button size="sm" onClick={onSave} disabled={saving} className="h-8">
        <Save className="h-3.5 w-3.5 mr-1.5" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
