import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSchemaRegistry, SchemaField, SchemaTable } from "./useSchemaRegistry";

export function useSystemTables() {
  const { schemas, loading: registryLoading } = useSchemaRegistry();

  const { data: introspection, isLoading } = useQuery({
    queryKey: ["system-tables-introspect"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("schema-introspect", {
        body: null,
        headers: {},
      });
      // The function uses GET-style params but invoke sends POST;
      // we need to call with query string via fetch directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${supabaseUrl}/functions/v1/schema-introspect?includeSystem=true`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to introspect");
      return await res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get table names already in the schema registry
  const registryTableNames = new Set(
    schemas.flatMap((s) => s.tables.map((t) => t.name))
  );

  // Convert introspected tables to SchemaTable format, only for system tables
  const systemTables: SchemaTable[] = (introspection?.tables || [])
    .filter((t: any) => !registryTableNames.has(t.name))
    .map((t: any) => ({
      nodeId: `system-${t.name}`,
      name: t.name,
      label: t.name,
      color: "#6b7280",
      fields: (t.columns || []).map((col: any, i: number) => ({
        id: `${t.name}-${col.name}-${i}`,
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        isPrimaryKey: col.isPrimaryKey,
        defaultValue: col.defaultValue || "",
      })),
    }));

  const getTable = (tableName: string): SchemaTable | undefined => {
    return systemTables.find((t) => t.name === tableName);
  };

  return {
    systemTables,
    getTable,
    loading: isLoading || registryLoading,
  };
}
