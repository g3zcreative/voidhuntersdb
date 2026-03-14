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
import EntityNodeComponent, {
  type EntityNodeData,
  type EntityField,
} from "@/components/admin/EntityNode";
import { EntityEditorToolbar } from "@/components/admin/EntityEditorToolbar";
import { SQLPreviewDialog } from "@/components/admin/SQLPreviewDialog";
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [schemaName, setSchemaName] = useState("Untitled Schema");
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<{ id: string; name: string; deployed: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [deployed, setDeployed] = useState(false);

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
        },
      })),
    [nodes, onUpdateLabel, onAddField, onRemoveField, onUpdateField]
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
        onUpdateLabel,
        onAddField,
        onRemoveField,
        onUpdateField,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, onUpdateLabel, onAddField, onRemoveField, onUpdateField]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Strip callbacks for serialization
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
    setDeployed((data as any).deployed ?? false);

    const schema = data.schema as unknown as { nodes: any[]; edges: Edge[] };
    const loadedNodes: Node[] = (schema.nodes || []).map((n: any) => ({
      ...n,
      data: {
        ...n.data,
        onUpdateLabel,
        onAddField,
        onRemoveField,
        onUpdateField,
      },
    }));
    setNodes(loadedNodes);
    setEdges(schema.edges || []);
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setSelectedSchemaId(null);
    setSchemaName("Untitled Schema");
    setDeployed(false);
  };

  const handleDeploy = async () => {
    if (!selectedSchemaId) {
      toast({ title: "Save the schema first", variant: "destructive" });
      return;
    }
    const newState = !deployed;
    const { error } = await supabase
      .from("entity_definitions")
      .update({ deployed: newState } as any)
      .eq("id", selectedSchemaId);
    if (error) {
      toast({ title: "Deploy failed", variant: "destructive" });
      return;
    }
    setDeployed(newState);
    toast({ title: newState ? "Schema deployed — tables now appear in Collections" : "Schema undeployed" });
  };

  // SQL generation
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

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <EntityEditorToolbar
        schemaName={schemaName}
        onSchemaNameChange={setSchemaName}
        onAddEntity={handleAddEntity}
        onSave={handleSave}
        onExportSQL={() => setSqlDialogOpen(true)}
        onClear={handleClear}
        saving={saving}
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
                <p className="text-sm">Click "Add Entity" to start designing your schema</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      <SQLPreviewDialog
        open={sqlDialogOpen}
        onOpenChange={setSqlDialogOpen}
        sql={generateSQL()}
      />
    </div>
  );
}
