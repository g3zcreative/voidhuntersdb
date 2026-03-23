import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings, Save, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settingsRow, isLoading: patchLoading } = useQuery({
    queryKey: ["site-settings-row"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("id, current_patch")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [currentPatch, setCurrentPatch] = useState("");

  useEffect(() => {
    if (settingsRow?.current_patch) setCurrentPatch(settingsRow.current_patch);
  }, [settingsRow]);

  const savePatchMutation = useMutation({
    mutationFn: async (patch: string) => {
      if (settingsRow?.id) {
        const { error } = await supabase
          .from("site_settings")
          .update({ current_patch: patch })
          .eq("id", settingsRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ current_patch: patch });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings-row"] });
      toast.success("Settings saved");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage game info and platform configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="h-5 w-5" /> Game Info
          </CardTitle>
          <CardDescription>
            Current game version displayed across the site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patchLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Current Patch</label>
                <Input
                  value={currentPatch}
                  onChange={(e) => setCurrentPatch(e.target.value)}
                  placeholder="e.g. 1.2.0"
                />
              </div>
              <Button
                onClick={() => savePatchMutation.mutate(currentPatch)}
                disabled={savePatchMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
