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

/** Describes a many-to-many relationship via a junction table */
export interface ManyToManyRelation {
  junctionTable: string;
  junctionNodeId: string;
  relatedTable: string;
  relatedNodeId: string;
  junctionFkToSelf: string;   // e.g. "hunter_id"
  junctionFkToRelated: string; // e.g. "tag_id"
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
    label?: string;
    data?: any;
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

/**
 * Detect if a table is a junction table (has exactly 2 FK edges out, and
 * only auto-fields + those 2 FK columns).
 */
function isJunctionTable(table: SchemaTable, outEdges: Array<{ source: string; target: string }>): boolean {
  if (outEdges.length !== 2) return false;
  const nonAutoFields = table.fields.filter((f) => !isAutoField(f));
  // Junction tables typically have exactly 2 non-auto fields (the 2 FK columns)
  return nonAutoFields.length <= 2;
}

/**
 * For a given table, find all many-to-many relationships via junction tables.
 */
function findManyToMany(
  table: SchemaTable,
  allTables: SchemaTable[],
  edges: SchemaDefinition["edges"]
): ManyToManyRelation[] {
  const relations: ManyToManyRelation[] = [];

  // Find edges pointing TO this table (junction → this table)
  const incomingEdges = edges.filter((e) => e.target === table.nodeId);

  for (const inEdge of incomingEdges) {
    const junctionNode = allTables.find((t) => t.nodeId === inEdge.source);
    if (!junctionNode) continue;

    // Get all outgoing edges from the junction table
    const junctionOutEdges = edges.filter((e) => e.source === junctionNode.nodeId);
    if (!isJunctionTable(junctionNode, junctionOutEdges)) continue;

    // Find the other edge (to the related table)
    const otherEdge = junctionOutEdges.find((e) => e.target !== table.nodeId);
    if (!otherEdge) continue;

    const relatedTable = allTables.find((t) => t.nodeId === otherEdge.target);
    if (!relatedTable) continue;

    // Determine FK column names from edge data/labels
    const fallbackSelf = `${table.name.replace(/s$/, "")}_id`;
    const fallbackRelated = `${relatedTable.name.replace(/s$/, "")}_id`;
    const fkToSelf = inEdge.data?.sourceColumn || (inEdge.label && inEdge.label !== "FK" ? inEdge.label : fallbackSelf);
    const fkToRelated = otherEdge.data?.sourceColumn || (otherEdge.label && otherEdge.label !== "FK" ? otherEdge.label : fallbackRelated);

    relations.push({
      junctionTable: junctionNode.name,
      junctionNodeId: junctionNode.nodeId,
      relatedTable: relatedTable.name,
      relatedNodeId: relatedTable.nodeId,
      junctionFkToSelf: fkToSelf,
      junctionFkToRelated: fkToRelated,
    });
  }

  return relations;
}

function parseSchema(row: any): SchemaDefinition {
  const schema = row.schema as any;
  const nodes: any[] = schema?.nodes || [];
  const edges: any[] = schema?.edges || [];

  const tables: SchemaTable[] = nodes.map((n: any) => ({
    nodeId: n.id,
    name: (n.data?.label || "unknown").replace(/\s+/g, "_").toLowerCase(),
    label: n.data?.label || "Unknown",
    fields: ((n.data?.fields || []) as SchemaField[]).filter((f) => f.name && f.name.trim() !== ""),
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
      label: e.label,
      data: e.data,
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

  /** Get many-to-many relationships for a given table */
  const getManyToMany = (tableName: string): ManyToManyRelation[] => {
    const table = getTable(tableName);
    if (!table) return [];
    const schema = getSchemaForTable(tableName);
    if (!schema) return [];
    return findManyToMany(table, schema.tables, schema.edges);
  };

  /** Get foreign key mappings for a given table, derived from edge metadata */
  const getForeignKeys = (tableName: string): Array<{ column: string; referencedTable: string }> => {
    const table = getTable(tableName);
    if (!table) return [];
    const schema = getSchemaForTable(tableName);
    if (!schema) return [];
    const outEdges = schema.edges.filter((e) => e.source === table.nodeId);
    return outEdges
      .map((edge) => {
        const targetTable = schema.tables.find((t) => t.nodeId === edge.target);
        if (!targetTable) return null;
        const column = edge.data?.sourceColumn || edge.label || null;
        if (!column || column === "FK") return null;
        return { column, referencedTable: targetTable.name };
      })
      .filter(Boolean) as Array<{ column: string; referencedTable: string }>;
  };

  /** Check if a table is a junction table (should be hidden from standalone list) */
  const isJunction = (tableName: string): boolean => {
    const table = getTable(tableName);
    if (!table) return false;
    const schema = getSchemaForTable(tableName);
    if (!schema) return false;
    const outEdges = schema.edges.filter((e) => e.source === table.nodeId);
    return isJunctionTable(table, outEdges);
  };

  return {
    schemas: query.data || [],
    tables: allTables,
    getTable,
    getSchemaForTable,
    getManyToMany,
    getForeignKeys,
    isJunction,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
