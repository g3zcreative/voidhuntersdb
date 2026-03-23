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
};

export function useFeatureFlags() {
  // Feature flags are not yet stored in the database — return defaults
  // When a feature_flags table or column is added, wire it up here
  return { flags: defaults, loading: false };
}
