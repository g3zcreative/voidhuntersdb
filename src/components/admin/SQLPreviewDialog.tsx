import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Rocket, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface SQLPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  mode?: "export" | "deploy";
  onExecute?: () => void;
  executing?: boolean;
}

export function SQLPreviewDialog({ open, onOpenChange, sql, mode = "export", onExecute, executing }: SQLPreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasDestructive = sql.includes("DROP TABLE") || sql.includes("DROP COLUMN");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {mode === "deploy" ? "Deploy Preview — Schema Changes" : "Generated SQL"}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {hasDestructive && mode === "deploy" && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-destructive">
              This migration includes <strong>destructive changes</strong> (DROP TABLE/COLUMN). Data in dropped tables/columns will be permanently lost.
            </p>
          </div>
        )}

        <pre className="bg-muted rounded-md p-4 text-xs overflow-auto max-h-[50vh] font-mono whitespace-pre-wrap">
          {sql || (mode === "deploy" ? "-- No changes detected" : "-- No entities defined yet")}
        </pre>

        {mode === "deploy" && sql && onExecute && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={onExecute}
              disabled={executing}
              className={hasDestructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              <Rocket className="h-3.5 w-3.5 mr-1.5" />
              {executing ? "Deploying..." : hasDestructive ? "Deploy (Destructive)" : "Deploy"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
