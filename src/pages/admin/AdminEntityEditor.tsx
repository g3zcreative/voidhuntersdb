import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSchemaIntrospect, type IntrospectedTable, type IntrospectedFK } from "@/hooks/useSchemaIntrospect";
import EntityNodeComponent, {
  type EntityNodeData,
  type EntityField,
} from "@/components/admin/EntityNode";
import { EntityEditorToolbar } from "@/components/admin/EntityEditorToolbar";
import { SQLPreviewDialog } from "@/components/admin/SQLPreviewDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Json } from "@/integrations/supabase/types";

const NODE_COLORS = [
  "259 100% 64%",
  "170 80% 45%",
  "30 95% 55%",
  "340 75% 55%",
  "200 85% 50%",
  "120 60% 45%",
  "280 70% 55%",
  "50 90% 50%",
];

let colorIndex = 0;
const nextColor = () => NODE_COLORS[colorIndex++ % NODE_COLORS.length];

const createFieldId = () => crypto.randomUUID();

const defaultFields = (): EntityField[] => [
  { id: createFieldId(), name: "id", type: "uuid", nullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
  { id: createFieldId(), name: "created_at", type: "timestamptz", nullable: false, isPrimaryKey: false, defaultValue: "now()" },
  { id: createFieldId(), name: "updated_at", type: "timestamptz", nullable: false, isPrimaryKey: false, defaultValue: "now()" },
];

const nodeTypes = { entity: EntityNodeComponent };

export default function AdminEntityEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { introspection, loading: introspecting, deploying, introspect, previewDeploy, executeDeploy } = useSchemaIntrospect();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [schemaName, setSchemaName] = useState("Untitled Schema");
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<{ id: string; name: string; deployed: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [sqlDialogMode, setSqlDialogMode] = useState<"export" | "deploy">("export");
  const [deploySQL, setDeploySQL] = useState("");
  const [deployPayload, setDeployPayload] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ nodeId: string; label: string; hasData: boolean } | null>(null);

  // Load saved schemas list
  useEffect(() => {
    supabase
      .from("entity_definitions")
      .select("id, name, deployed")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setSchemas(data as any);
      });
  }, []);

  // Node data callbacks
  const onUpdateLabel = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        )
      );
    },
    [setNodes]
  );

  const onAddField = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as EntityNodeData;
          return {
            ...n,
            data: {
              ...n.data,
              fields: [
                ...d.fields,
                { id: createFieldId(), name: "", type: "text", nullable: true, isPrimaryKey: false, defaultValue: "" },
              ],
            },
          };
        })
      );
    },
    [setNodes]
  );

  const onRemoveField = useCallback(
    (nodeId: string, fieldId: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as EntityNodeData;
          return { ...n, data: { ...n.data, fields: d.fields.filter((f) => f.id !== fieldId) } };
        })
      );
    },
    [setNodes]
  );

  const onUpdateField = useCallback(
    (nodeId: string, fieldId: string, updates: Partial<EntityField>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as EntityNodeData;
          return {
            ...n,
            data: {
              ...n.data,
              fields: d.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            },
          };
        })
      );
    },
    [setNodes]
  );

  const onDeleteNode = useCallback(
    async (nodeId: string, label: string) => {
      const tableName = label.replace(/\s+/g, "_").toLowerCase();
      try {
        const { count, error } = await supabase
          .from(tableName as any)
          .select("*", { count: "exact", head: true });
        if (!error && count && count > 0) {
          setDeleteConfirm({ nodeId, label: tableName, hasData: true });
          return;
        }
      } catch {
        // Table may not exist yet
      }
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const confirmDeleteNode = useCallback(() => {
    if (!deleteConfirm) return;
    setNodes((nds) => nds.filter((n) => n.id !== deleteConfirm.nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== deleteConfirm.nodeId && e.target !== deleteConfirm.nodeId));
    setDeleteConfirm(null);
    toast({ title: `Table "${deleteConfirm.label}" removed from schema` });
  }, [deleteConfirm, setNodes, setEdges, toast]);

  // Inject callbacks into nodes
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onUpdateLabel,
          onAddField,
          onRemoveField,
          onUpdateField,
          onDeleteNode,
        },
      })),
    [nodes, onUpdateLabel, onAddField, onRemoveField, onUpdateField, onDeleteNode]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(259 100% 64%)" },
            style: { stroke: "hsl(259 100% 64%)", strokeWidth: 2 },
            label: "FK",
            labelStyle: { fontSize: 10, fill: "hsl(215 12% 55%)" },
            labelBgStyle: { fill: "hsl(228 12% 11%)", fillOpacity: 0.9 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleAddEntity = useCallback(() => {
    const id = crypto.randomUUID();
    const newNode: Node = {
      id,
      type: "entity",
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
      data: {
        label: "new_table",
        fields: defaultFields(),
        color: nextColor(),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const serializedNodes = nodes.map(({ data, ...rest }) => ({
      id: rest.id,
      type: rest.type,
      position: rest.position,
      data: {
        label: (data as any).label,
        fields: (data as any).fields,
        color: (data as any).color,
      },
    }));

    const payload = {
      name: schemaName,
      schema: JSON.parse(JSON.stringify({ nodes: serializedNodes, edges })) as Json,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    try {
      if (selectedSchemaId) {
        await supabase
          .from("entity_definitions")
          .update(payload)
          .eq("id", selectedSchemaId);
      } else {
        const { data } = await supabase
          .from("entity_definitions")
          .insert(payload)
          .select("id")
          .single();
        if (data) setSelectedSchemaId(data.id);
      }
      toast({ title: "Schema saved" });
      const { data: list } = await supabase
        .from("entity_definitions")
        .select("id, name, deployed")
        .order("updated_at", { ascending: false });
      if (list) setSchemas(list as any);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleLoadSchema = async (id: string) => {
    const { data } = await supabase
      .from("entity_definitions")
      .select("*")
      .eq("id", id)
      .single();
    if (!data) return;

    setSelectedSchemaId(data.id);
    setSchemaName(data.name);

    const schema = data.schema as unknown as { nodes: any[]; edges: Edge[] };
    const loadedNodes: Node[] = (schema.nodes || []).map((n: any) => ({
      ...n,
      data: { ...n.data },
    }));
    setNodes(loadedNodes);
    setEdges(schema.edges || []);
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setSelectedSchemaId(null);
    setSchemaName("Untitled Schema");
  };

  // --- Import tables from DB ---
  const handleImportFromDB = useCallback(async () => {
    const result = await introspect();
    if (!result) return;

    const existingTableNames = new Set(
      nodes.map((n) => ((n.data as any).label as string).replace(/\s+/g, "_").toLowerCase())
    );

    const newNodes: Node[] = [];
    const GRID_COLS = 3;
    const X_SPACING = 320;
    const Y_SPACING = 350;
    let idx = nodes.length;

    for (const table of result.tables) {
      if (existingTableNames.has(table.name)) continue;
      const col = idx % GRID_COLS;
      const row = Math.floor(idx / GRID_COLS);
      newNodes.push({
        id: crypto.randomUUID(),
        type: "entity",
        position: { x: 50 + col * X_SPACING, y: 50 + row * Y_SPACING },
        data: {
          label: table.name,
          fields: table.columns.map((c) => ({
            id: createFieldId(),
            name: c.name,
            type: c.type,
            nullable: c.nullable,
            isPrimaryKey: c.isPrimaryKey,
            defaultValue: c.defaultValue,
          })),
          color: nextColor(),
        },
      });
      idx++;
    }

    if (newNodes.length === 0) {
      toast({ title: "No new tables to import" });
      return;
    }

    setNodes((nds) => [...nds, ...newNodes]);

    // Add edges for foreign keys
    const allNodes = [...nodes, ...newNodes];
    const nodeByTable = new Map<string, string>();
    for (const n of allNodes) {
      const name = ((n.data as any).label as string).replace(/\s+/g, "_").toLowerCase();
      nodeByTable.set(name, n.id);
    }

    const newEdges: Edge[] = [];
    for (const fk of result.foreignKeys) {
      const sourceId = nodeByTable.get(fk.sourceTable);
      const targetId = nodeByTable.get(fk.targetTable);
      if (sourceId && targetId) {
        newEdges.push({
          id: `fk-${fk.constraintName}`,
          source: sourceId,
          target: targetId,
          type: "smoothstep",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(259 100% 64%)" },
          style: { stroke: "hsl(259 100% 64%)", strokeWidth: 2 },
          label: fk.sourceColumn,
          labelStyle: { fontSize: 10, fill: "hsl(215 12% 55%)" },
          labelBgStyle: { fill: "hsl(228 12% 11%)", fillOpacity: 0.9 },
          data: { constraintName: fk.constraintName, sourceColumn: fk.sourceColumn, targetColumn: fk.targetColumn },
        });
      }
    }

    if (newEdges.length > 0) {
      setEdges((eds) => [...eds, ...newEdges]);
    }

    toast({ title: `Imported ${newNodes.length} table(s) from database` });
  }, [nodes, introspect, setNodes, setEdges, toast]);

  // --- Build deploy payload from current canvas ---
  const buildDeployPayload = useCallback(() => {
    const desiredTables = nodes.map((n) => {
      const d = n.data as unknown as EntityNodeData;
      return {
        name: (d.label as string).replace(/\s+/g, "_").toLowerCase(),
        columns: d.fields.map((f) => ({
          name: f.name,
          type: f.type,
          nullable: f.nullable,
          isPrimaryKey: f.isPrimaryKey,
          defaultValue: f.defaultValue,
        })),
      };
    });

    // Derive FK info from edges
    const desiredForeignKeys = edges
      .map((e) => {
        const srcNode = nodes.find((n) => n.id === e.source);
        const tgtNode = nodes.find((n) => n.id === e.target);
        if (!srcNode || !tgtNode) return null;
        const srcTable = ((srcNode.data as any).label as string).replace(/\s+/g, "_").toLowerCase();
        const tgtTable = ((tgtNode.data as any).label as string).replace(/\s+/g, "_").toLowerCase();

        // Use explicit edge data first
        let sourceColumn = (e.data as any)?.sourceColumn;
        if (!sourceColumn) {
          // Try to find a matching FK column in the source table's fields
          const srcFields: EntityField[] = (srcNode.data as any).fields || [];
          const candidates = [
            `${tgtTable}_id`,                                           // exact match (e.g. hunters_id)
            `${tgtTable.replace(/s$/, "")}_id`,                        // singularized (e.g. hunter_id)
            `${tgtTable.replace(/ies$/, "y")}_id`,                     // categories -> category_id
            `${tgtTable.replace(/es$/, "")}_id`,                       // matches -> match_id
          ];
          const found = candidates.find((c) => srcFields.some((f) => f.name === c));
          sourceColumn = found || candidates[1] || `${tgtTable}_id`; // default to singular
        }

        const targetColumn = (e.data as any)?.targetColumn || "id";
        const constraintName = (e.data as any)?.constraintName || `fk_${srcTable}_${sourceColumn}`;
        return { sourceTable: srcTable, sourceColumn, targetTable: tgtTable, targetColumn, constraintName };
      })
      .filter(Boolean);

    return { desiredTables, desiredForeignKeys };
  }, [nodes, edges]);

  // --- Deploy flow ---
  const handleDeploy = useCallback(async () => {
    // 1. Introspect current state
    const current = await introspect();
    if (!current) return;

    const { desiredTables, desiredForeignKeys } = buildDeployPayload();

    const payload = {
      mode: "preview" as const,
      desiredTables,
      desiredForeignKeys,
      currentTables: current.tables.map((t) => ({
        name: t.name,
        columns: t.columns.map((c) => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          isPrimaryKey: c.isPrimaryKey,
          defaultValue: c.defaultValue,
        })),
      })),
      currentForeignKeys: current.foreignKeys,
    };

    const preview = await previewDeploy(payload);
    if (!preview) return;

    if (!preview.sql || preview.statements.length === 0) {
      toast({ title: "No changes to deploy — schema is already in sync" });
      return;
    }

    setDeploySQL(preview.sql);
    setDeployPayload(payload);
    setSqlDialogMode("deploy");
    setSqlDialogOpen(true);
  }, [introspect, buildDeployPayload, previewDeploy, toast]);

  const handleExecuteDeploy = useCallback(async () => {
    if (!deployPayload) return;
    const result = await executeDeploy(deployPayload);
    if (result) {
      setSqlDialogOpen(false);
      setDeploySQL("");
      setDeployPayload(null);
    }
  }, [deployPayload, executeDeploy]);

  // SQL generation for export
  const generateSQL = useCallback(() => {
    const lines: string[] = [];

    for (const node of nodes) {
      const d = node.data as unknown as EntityNodeData;
      const tableName = (d.label as string).replace(/\s+/g, "_").toLowerCase();
      lines.push(`CREATE TABLE public.${tableName} (`);

      const colDefs = d.fields.map((f) => {
        let col = `  ${f.name} ${f.type.toUpperCase()}`;
        if (!f.nullable) col += " NOT NULL";
        if (f.isPrimaryKey) col += " PRIMARY KEY";
        if (f.defaultValue) col += ` DEFAULT ${f.defaultValue}`;
        return col;
      });
      lines.push(colDefs.join(",\n"));
      lines.push(");\n");
      lines.push(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`);
    }

    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (sourceNode && targetNode) {
        const srcD = sourceNode.data as unknown as EntityNodeData;
        const tgtD = targetNode.data as unknown as EntityNodeData;
        const srcTable = (srcD.label as string).replace(/\s+/g, "_").toLowerCase();
        const tgtTable = (tgtD.label as string).replace(/\s+/g, "_").toLowerCase();
        lines.push(
          `-- FK: ${srcTable} -> ${tgtTable}`,
          `ALTER TABLE public.${srcTable} ADD CONSTRAINT fk_${srcTable}_${tgtTable}`,
          `  FOREIGN KEY (${tgtTable}_id) REFERENCES public.${tgtTable}(id);`,
          ""
        );
      }
    }

    return lines.join("\n");
  }, [nodes, edges]);

  const handleExportSQL = useCallback(() => {
    setSqlDialogMode("export");
    setDeploySQL(generateSQL());
    setSqlDialogOpen(true);
  }, [generateSQL]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <EntityEditorToolbar
        schemaName={schemaName}
        onSchemaNameChange={setSchemaName}
        onAddEntity={handleAddEntity}
        onSave={handleSave}
        onExportSQL={handleExportSQL}
        onClear={handleClear}
        onDeploy={handleDeploy}
        onImportFromDB={handleImportFromDB}
        saving={saving}
        importing={introspecting}
        schemas={schemas}
        selectedSchemaId={selectedSchemaId}
        onLoadSchema={handleLoadSchema}
      />

      <div className="flex-1 bg-background">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(228 10% 22%)" />
          <Controls
            className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted"
          />
          <MiniMap
            className="!bg-card !border-border !rounded-lg"
            nodeColor="hsl(259 100% 64%)"
            maskColor="hsl(228 12% 8% / 0.7)"
          />
          {nodes.length === 0 && (
            <Panel position="top-center" className="mt-20">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-1">No entities yet</p>
                <p className="text-sm">Click "Add Entity" or "Import from DB" to start</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      <SQLPreviewDialog
        open={sqlDialogOpen}
        onOpenChange={setSqlDialogOpen}
        sql={sqlDialogMode === "deploy" ? deploySQL : generateSQL()}
        mode={sqlDialogMode}
        onExecute={sqlDialogMode === "deploy" ? handleExecuteDeploy : undefined}
        executing={deploying}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete table "{deleteConfirm?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.hasData
                ? "This table contains existing data. Removing it from the schema will NOT drop the database table, but if you re-deploy, the table will no longer be managed. This action cannot be undone."
                : "This will remove the table from your schema."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNode}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfirm?.hasData ? "Delete Anyway" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
