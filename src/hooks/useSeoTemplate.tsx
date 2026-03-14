import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SeoTemplate {
  title_template: string | null;
  description_template: string | null;
}

export function useSeoTemplate(entityType: string | undefined) {
  return useQuery({
    queryKey: ["seo-template", entityType],
    queryFn: async () => {
      if (!entityType) return null;
      const { data, error } = await supabase
        .from("seo_templates" as any)
        .select("title_template, description_template")
        .eq("entity_type", entityType)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SeoTemplate | null;
    },
    enabled: !!entityType,
    staleTime: 5 * 60_000,
  });
}

/**
 * Interpolates a template string with variables.
 * E.g. "{name} Godforge | GodforgeHub.com" with { name: "Artemis" }
 * → "Artemis Godforge | GodforgeHub.com"
 */
export function interpolateTemplate(
  template: string | null | undefined,
  vars: Record<string, string | number | null | undefined>
): string | undefined {
  if (!template) return undefined;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val != null ? String(val) : "";
  });
}
