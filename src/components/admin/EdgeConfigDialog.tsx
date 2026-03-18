import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { EntityField } from "@/components/admin/EntityNode";

const AUTO_CREATE = "__auto_create__";

export interface EdgeConfigResult {
  sourceColumn: string;
  targetColumn: string;
  autoCreatedColumn?: string; // set when user chose auto-create
  inline?: boolean; // show child rows inline on parent form
}

interface EdgeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTableName: string;
  targetTableName: string;
  sourceFields: EntityField[];
  targetFields: EntityField[];
  initialSourceColumn?: string;
  initialTargetColumn?: string;
  initialInline?: boolean;
  onApply: (result: EdgeConfigResult) => void;
  onCancel: () => void;
}

export function EdgeConfigDialog({
  open,
  onOpenChange,
  sourceTableName,
  targetTableName,
  sourceFields,
  targetFields,
  initialSourceColumn,
  initialTargetColumn,
  initialInline,
  onApply,
  onCancel,
}: EdgeConfigDialogProps) {
  const autoName = `${targetTableName.replace(/s$/, "")}_id`;

  const [sourceColumn, setSourceColumn] = useState(
    initialSourceColumn || AUTO_CREATE
  );
  const [targetColumn, setTargetColumn] = useState(
    initialTargetColumn || "id"
  );
  const [inline, setInline] = useState(initialInline ?? false);

  useEffect(() => {
    if (open) {
      setSourceColumn(initialSourceColumn || AUTO_CREATE);
      setTargetColumn(initialTargetColumn || "id");
      setInline(initialInline ?? false);
    }
  }, [open, initialSourceColumn, initialTargetColumn, initialInline]);

  const uuidSourceFields = useMemo(
    () => sourceFields.filter((f) => f.type === "uuid" && !f.isPrimaryKey),
    [sourceFields]
  );

  const pkTargetFields = useMemo(
    () => targetFields.filter((f) => f.isPrimaryKey),
    [targetFields]
  );

  const handleApply = () => {
    if (sourceColumn === AUTO_CREATE) {
      onApply({
        sourceColumn: autoName,
        targetColumn,
        autoCreatedColumn: autoName,
        inline,
      });
    } else {
      onApply({ sourceColumn, targetColumn, inline });
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Foreign Key</DialogTitle>
          <DialogDescription>
            {sourceTableName} → {targetTableName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Source column ({sourceTableName})</Label>
            <Select value={sourceColumn} onValueChange={setSourceColumn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_CREATE}>
                  ✨ Auto-create "{autoName}"
                </SelectItem>
                {uuidSourceFields.map((f) => (
                  <SelectItem key={f.id} value={f.name}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target column ({targetTableName})</Label>
            <Select value={targetColumn} onValueChange={setTargetColumn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pkTargetFields.length > 0 ? (
                  pkTargetFields.map((f) => (
                    <SelectItem key={f.id} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="id">id</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
