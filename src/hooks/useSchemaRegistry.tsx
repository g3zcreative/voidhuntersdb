import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SchemaField {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string;
}

export interface SchemaTable {
  nodeId: string;
  name: string;
  label: string;
  fields: SchemaField[];
  color: string;
}

export interface SchemaDefinition {
  id: string;
  name: string;
  deployed: boolean;
  publicSlug: string | null;
  tables: SchemaTable[];
  edges: Array<{
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

/** Map Entity Editor DB types to form input types */
export function fieldTypeToInputType(dbType: string): "text" | "number" | "boolean" | "json" | "datetime" | "textarea" {
  const t = dbType.toLowerCase();
  if (["integer", "int", "int4", "int8", "bigint", "smallint", "numeric", "decimal", "real", "float", "double precision"].includes(t)) return "number";
  if (t === "boolean" || t === "bool") return "boolean";
  if (t === "jsonb" || t === "json") return "json";
  if (["timestamptz", "timestamp", "date", "time"].includes(t)) return "datetime";
  if (t === "text" || t === "varchar" || t === "character varying") return "text";
  return "text";
}

/** Fields that are auto-managed and should be hidden from create/edit forms */
export function isAutoField(field: SchemaField): boolean {
  const autoNames = ["id", "created_at", "updated_at"];
  return autoNames.includes(field.name) && !!field.defaultValue;
}

function parseSchema(row: any): SchemaDefinition {
  const schema = row.schema as any;
  const nodes: any[] = schema?.nodes || [];
  const edges: any[] = schema?.edges || [];

  const tables: SchemaTable[] = nodes.map((n: any) => ({
    nodeId: n.id,
    name: (n.data?.label || "unknown").replace(/\s+/g, "_").toLowerCase(),
    label: n.data?.label || "Unknown",
    fields: (n.data?.fields || []) as SchemaField[],
    color: n.data?.color || "259 100% 64%",
  }));

  return {
    id: row.id,
    name: row.name,
    deployed: row.deployed ?? false,
    publicSlug: row.public_slug ?? null,
    tables,
    edges: edges.map((e: any) => ({
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };
}

export function useSchemaRegistry(deployedOnly = true) {
  const query = useQuery({
    queryKey: ["schema-registry", deployedOnly],
    queryFn: async () => {
      let q = supabase.from("entity_definitions").select("*").order("name");
      if (deployedOnly) q = q.eq("deployed", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(parseSchema);
    },
  });

  const allTables = (query.data || []).flatMap((s) => s.tables);

  const getTable = (tableName: string) =>
    allTables.find((t) => t.name === tableName);

  const getSchemaForTable = (tableName: string) =>
    (query.data || []).find((s) => s.tables.some((t) => t.name === tableName));

  return {
    schemas: query.data || [],
    tables: allTables,
    getTable,
    getSchemaForTable,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
