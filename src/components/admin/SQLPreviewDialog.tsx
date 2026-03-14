import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface SQLPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
}

export function SQLPreviewDialog({ open, onOpenChange, sql }: SQLPreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Generated SQL
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </DialogTitle>
        </DialogHeader>
        <pre className="bg-muted rounded-md p-4 text-xs overflow-auto max-h-[60vh] font-mono whitespace-pre-wrap">
          {sql || "-- No entities defined yet"}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
