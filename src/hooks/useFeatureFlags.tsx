import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlags {
  guides: boolean;
  tools: boolean;
  database: boolean;
  
}

const defaults: FeatureFlags = {
  guides: true,
  tools: false,
  database: false,
  community: true,
};

export function useFeatureFlags() {
  const { data, isLoading } = useQuery({
    queryKey: ["site-settings", "feature_flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "feature_flags")
        .single();
      if (error) throw error;
      return data.value as unknown as FeatureFlags;
    },
    staleTime: 60_000,
  });

  return { flags: data ?? defaults, loading: isLoading };
}
