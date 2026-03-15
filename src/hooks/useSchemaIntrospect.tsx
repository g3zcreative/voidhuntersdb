import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface IntrospectedColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string;
}

export interface IntrospectedTable {
  name: string;
  rlsEnabled: boolean;
  columns: IntrospectedColumn[];
}

export interface IntrospectedFK {
  constraintName: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface IntrospectionResult {
  tables: IntrospectedTable[];
  foreignKeys: IntrospectedFK[];
}

export interface DeployPayload {
  mode: "preview" | "execute";
  desiredTables: { name: string; columns: IntrospectedColumn[] }[];
  desiredForeignKeys: { sourceTable: string; sourceColumn: string; targetTable: string; targetColumn: string; constraintName?: string }[];
  currentTables: { name: string; columns: IntrospectedColumn[] }[];
  currentForeignKeys: IntrospectedFK[];
}

export function useSchemaIntrospect() {
  const { toast } = useToast();
  const [introspection, setIntrospection] = useState<IntrospectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const introspect = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("schema-introspect");
      if (error) throw error;
      setIntrospection(data as IntrospectionResult);
      return data as IntrospectionResult;
    } catch (err: any) {
      toast({ title: "Failed to introspect database", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const previewDeploy = useCallback(async (payload: DeployPayload) => {
    try {
      const { data, error } = await supabase.functions.invoke("schema-deploy", {
        body: { ...payload, mode: "preview" },
      });
      if (error) throw error;
      return data as { sql: string; statements: string[] };
    } catch (err: any) {
      toast({ title: "Failed to preview deploy", description: err.message, variant: "destructive" });
      return null;
    }
  }, [toast]);

  const executeDeploy = useCallback(async (payload: DeployPayload) => {
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("schema-deploy", {
        body: { ...payload, mode: "execute" },
      });
      if (error) throw error;
      toast({ title: "Schema deployed successfully!" });
      // Refresh introspection after deploy
      await introspect();
      return data;
    } catch (err: any) {
      toast({ title: "Deploy failed", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setDeploying(false);
    }
  }, [toast, introspect]);

  return { introspection, loading, deploying, introspect, previewDeploy, executeDeploy };
}
