import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeoSettings {
  siteTitle: string;
  metaDescription: string;
  ogImage: string;
}

const defaults: SeoSettings = {
  siteTitle: "VoidHuntersDB.com",
  metaDescription: "The premier source for all things Void Hunters, the upcoming hero collector RPG by Artifex Mundi. News, guides, database, and more.",
  ogImage: "",
};

export function useSeoSettings() {
  const { data } = useQuery({
    queryKey: ["site-settings", "seo_metadata"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "seo_metadata")
        .single();
      if (error) throw error;
      const raw = data.value as Record<string, string>;
      return {
        siteTitle: raw.siteTitle || raw.title || defaults.siteTitle,
        metaDescription: raw.metaDescription || raw.description || defaults.metaDescription,
        ogImage: raw.ogImage || raw.og_image || defaults.ogImage,
      } as SeoSettings;
    },
    staleTime: 60_000,
  });

  return data ?? defaults;
}
