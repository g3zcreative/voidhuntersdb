import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Settings, ToggleLeft, Save, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

interface FeatureFlags {
  guides: boolean;
  tools: boolean;
  database: boolean;
  community: boolean;
}

export default function AdminSettings() {
  const queryClient = useQueryClient();

  // Load current_patch from the actual site_settings table (single-row)
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

  // Feature flags — static for now until storage is added
  const [flags, setFlags] = useState<FeatureFlags>({ guides: true, tools: false, database: false, community: true });

  const featureFlagDescriptions: Record<keyof FeatureFlags, string> = {
    guides: "Community guides and strategies section",
    tools: "Interactive tools (tier lists, team builder, calculators)",
    database: "Full heroes, items, skills, and materials database",
    community: "Community links and social media page",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage feature visibility and game info
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ToggleLeft className="h-5 w-5" /> Feature Flags
          </CardTitle>
          <CardDescription>
            Toggle sections on or off. Disabled sections show a "Coming Soon" page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {(Object.keys(flags) as (keyof FeatureFlags)[]).map((key, i, arr) => (
            <div key={key}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium capitalize">{key}</p>
                  <p className="text-sm text-muted-foreground">
                    {featureFlagDescriptions[key]}
                  </p>
                </div>
                <Switch
                  checked={flags[key]}
                  onCheckedChange={(checked) =>
                    setFlags({ ...flags, [key]: checked })
                  }
                />
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
          <div className="pt-4 text-xs text-muted-foreground">
            Feature flag persistence coming soon — changes are session-only for now.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
