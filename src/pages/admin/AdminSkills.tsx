import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudPage, ColumnConfig } from "./AdminCrudPage";

export default function AdminSkills() {
  const { data: heroes = [] } = useQuery({
    queryKey: ["heroes_for_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heroes")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const heroOptions = heroes.map((h) => ({ value: h.id, label: h.name }));

  const columns: ColumnConfig[] = [
    { key: "name", label: "Name", required: true, showInTable: true },
    { key: "slug", label: "Slug", required: true, showInTable: true },
    { key: "skill_type", label: "Type", type: "select", required: true, showInTable: true, options: [
      { value: "Basic", label: "Basic" },
      { value: "Core", label: "Core" },
      { value: "Ultimate", label: "Ultimate" },
      { value: "Passive", label: "Passive" },
      { value: "Leader", label: "Leader" },
    ]},
    { key: "cooldown", label: "Cooldown", type: "number", showInTable: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "hero_id", label: "Hero", type: "select", options: heroOptions, showInTable: true },
    { key: "image_url", label: "Image URL", storageBucket: "images" },
    { key: "scaling", label: "Scaling (JSON)", type: "json" },
    { key: "scaling_formula", label: "Scaling Formula", showInTable: true },
    { key: "effects", label: "Effects (JSON)", type: "json" },
    { key: "awakening_level", label: "Awakening Level", type: "number" },
    { key: "awakening_bonus", label: "Awakening Bonus", type: "textarea" },
    { key: "ultimate_cost", label: "Ultimate Cost", type: "number" },
    { key: "initial_divinity", label: "Initial Divinity", type: "number" },
  ];

  return <AdminCrudPage tableName="skills" title="Skills" columns={columns} />;
}
