import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings, ToggleLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface FeatureFlags {
  guides: boolean;
  tools: boolean;
  database: boolean;
  community: boolean;
}

function useSiteSettings<T>(key: string) {
  return useQuery({
    queryKey: ["site-settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .single();
      if (error) throw error;
      return data.value as T;
    },
  });
}

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: flagsData, isLoading: flagsLoading } = useSiteSettings<FeatureFlags>("feature_flags");
  const [flags, setFlags] = useState<FeatureFlags>({ guides: false, tools: false, database: false, community: true });

  useEffect(() => {
    if (flagsData) setFlags(flagsData);
  }, [flagsData]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: value as any, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", key] });
      toast.success("Settings saved");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

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
          Manage feature visibility
        </p>
      </div>

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
          {flagsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
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
              <div className="pt-4">
                <Button
                  onClick={() => saveMutation.mutate({ key: "feature_flags", value: flags })}
                  disabled={saveMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : "Save Feature Flags"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
