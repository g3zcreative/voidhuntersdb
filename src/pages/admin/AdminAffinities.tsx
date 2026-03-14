import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

export default function AdminAffinities() {
  const { data: affinities = [] } = useQuery({
    queryKey: ["ref_affinities_self"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("affinities").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const columns: ColumnConfig[] = useMemo(() => [
    { key: "name", label: "Name", required: true, showInTable: true },
    { key: "slug", label: "Slug", required: true, showInTable: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "icon_url", label: "Icon", storageBucket: "icons" },
    {
      key: "strength_id", label: "Strong Against", type: "select", showInTable: true,
      options: affinities.map(a => ({ value: a.id, label: a.name })),
    },
    {
      key: "weakness_id", label: "Weak Against", type: "select", showInTable: true,
      options: affinities.map(a => ({ value: a.id, label: a.name })),
    },
  ], [affinities]);

  return <AdminCrudPage tableName="affinities" title="Affinities" columns={columns} />;
}
