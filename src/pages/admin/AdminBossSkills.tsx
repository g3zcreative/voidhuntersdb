import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

export default function AdminBossSkills() {
  const { data: bosses = [] } = useQuery({
    queryKey: ["bosses_for_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bosses")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const bossOptions = bosses.map((b) => ({ value: b.id, label: b.name }));

  const columns: ColumnConfig[] = [
    { key: "name", label: "Name", required: true, showInTable: true },
    { key: "slug", label: "Slug", required: true, showInTable: true },
    { key: "boss_id", label: "Boss", type: "select", required: true, options: bossOptions, showInTable: true },
    { key: "skill_type", label: "Type", type: "select", required: true, showInTable: true, options: [
      { value: "Basic", label: "Basic" },
      { value: "Core", label: "Core" },
      { value: "Ultimate", label: "Ultimate" },
      { value: "Passive", label: "Passive" },
    ]},
    { key: "damage_type", label: "Damage Type", showInTable: true },
    { key: "cooldown", label: "Cooldown", type: "number", showInTable: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "image_url", label: "Image", type: "image", storageBucket: "icons" },
    { key: "sort_order", label: "Sort Order", type: "number" },
  ];

  return <AdminCrudPage tableName="boss_skills" title="Boss Skills" columns={columns} />;
}
